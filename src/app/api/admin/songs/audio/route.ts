import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

import {
  type AudioCleanupResult,
} from "./cleanup-workflow";
import { cleanupJukeboxAudio, retryPendingAudioCleanup } from "./cleanup";
import {
  AudioUploadValidationError,
  readAudioDurationFromStream,
  validateAudioUpload,
} from "./metadata";
import {
  AudioStorageConfigurationError,
  AudioStorageValidationError,
  readOwnedJukeboxAudio,
  verifyUploadedJukeboxAudio,
} from "./storage";
import {
  AudioUploadPolicyError,
  createAudioTokenPolicy,
  parseAudioClientPayload,
} from "./upload-policy";

export const runtime = "nodejs";

type FinalizeBody = {
  type: "jukebox.finalize";
  songId: string;
  blob: { url: string; pathname: string };
};

function parseFinalizeBody(value: unknown): FinalizeBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AudioUploadPolicyError("Audio finalization data is invalid");
  }
  const body = value as Partial<FinalizeBody>;
  if (
    body.type !== "jukebox.finalize" ||
    typeof body.songId !== "string" ||
    !body.songId.trim() ||
    !body.blob ||
    typeof body.blob.url !== "string" ||
    typeof body.blob.pathname !== "string"
  ) {
    throw new AudioUploadPolicyError("Audio finalization data is invalid");
  }
  return {
    type: body.type,
    songId: body.songId.trim(),
    blob: { url: body.blob.url, pathname: body.blob.pathname },
  };
}

function cleanupRequired(result: AudioCleanupResult) {
  return result.status === "untracked"
    ? { audioUrl: result.audioUrl, pathname: result.pathname }
    : undefined;
}

async function finalizeAudio(body: FinalizeBody) {
  createAudioTokenPolicy(body.blob.pathname, body.songId);
  const stored = await verifyUploadedJukeboxAudio(
    body.blob.url,
    body.blob.pathname,
  );

  let durationSeconds: number;
  try {
    validateAudioUpload({ size: stored.size, type: stored.contentType });
    const content = await readOwnedJukeboxAudio(
      body.blob.url,
      body.blob.pathname,
    );
    durationSeconds = await readAudioDurationFromStream(content.stream, {
      mimeType: content.blob.contentType,
      size: content.blob.size,
      path: content.blob.pathname,
    });
  } catch (error) {
    const cleanup = await cleanupJukeboxAudio({
      audioUrl: body.blob.url,
      pathname: body.blob.pathname,
      reason: "metadata_validation_failed",
    });
    const detail = cleanupRequired(cleanup);
    const message =
      error instanceof AudioUploadValidationError
        ? error.message
        : "Audio metadata could not be verified";
    return NextResponse.json(
      { error: message, ...(detail ? { cleanupRequired: detail } : {}) },
      { status: 400 },
    );
  }

  const currentSong = await prisma.song.findUnique({
    where: { id: body.songId },
    select: { audioUrl: true, audioStoragePath: true },
  });
  if (!currentSong) {
    const cleanup = await cleanupJukeboxAudio({
      audioUrl: body.blob.url,
      pathname: body.blob.pathname,
      reason: "song_missing",
    });
    const detail = cleanupRequired(cleanup);
    return NextResponse.json(
      { error: "Song not found", ...(detail ? { cleanupRequired: detail } : {}) },
      { status: 404 },
    );
  }

  try {
    await prisma.song.update({
      where: { id: body.songId },
      data: {
        audioUrl: body.blob.url,
        audioStoragePath: body.blob.pathname,
        durationSeconds,
      },
    });
  } catch {
    const cleanup = await cleanupJukeboxAudio({
      audioUrl: body.blob.url,
      pathname: body.blob.pathname,
      reason: "database_update_failed",
    });
    const detail = cleanupRequired(cleanup);
    return NextResponse.json(
      { error: "Audio could not be attached", ...(detail ? { cleanupRequired: detail } : {}) },
      { status: 500 },
    );
  }

  let replacedAudioCleanup: AudioCleanupResult | undefined;
  if (
    currentSong.audioUrl &&
    currentSong.audioStoragePath &&
    currentSong.audioUrl !== body.blob.url
  ) {
    replacedAudioCleanup = await cleanupJukeboxAudio({
      audioUrl: currentSong.audioUrl,
      pathname: currentSong.audioStoragePath,
      reason: "replacement",
    });
  }
  const detail = replacedAudioCleanup
    ? cleanupRequired(replacedAudioCleanup)
    : undefined;
  return NextResponse.json({
    audioUrl: body.blob.url,
    durationSeconds,
    cleanupStatus: replacedAudioCleanup?.status,
    ...(detail ? { cleanupRequired: detail } : {}),
  });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as unknown;
    await retryPendingAudioCleanup().catch(() => {
      console.error("Unable to process pending audio cleanup records");
    });

    if (
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      (body as { type?: unknown }).type === "jukebox.finalize"
    ) {
      return finalizeAudio(parseFinalizeBody(body));
    }

    const result = await handleUpload({
      request,
      body: body as HandleUploadBody,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { songId } = parseAudioClientPayload(clientPayload);
        const song = await prisma.song.findUnique({
          where: { id: songId },
          select: { id: true },
        });
        if (!song) throw new AudioUploadPolicyError("Song not found");
        return createAudioTokenPolicy(pathname, songId);
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof AudioUploadValidationError ||
      error instanceof AudioUploadPolicyError ||
      error instanceof AudioStorageValidationError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AudioStorageConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Jukebox audio request failed");
    return NextResponse.json({ error: "Audio request failed" }, { status: 500 });
  }
}

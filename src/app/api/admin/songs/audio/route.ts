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
import { settleAudioCasResult } from "./finalization-workflow";

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

function cleanupRequired(
  result: AudioCleanupResult,
  fallback?: { pathname: string; audioUrl?: string; url?: string },
) {
  if (result.status === "untracked") {
    return { audioUrl: result.audioUrl, pathname: result.pathname };
  }
  if (result.status !== "skipped" || !fallback) return undefined;
  const audioUrl = fallback.audioUrl ?? fallback.url;
  return audioUrl ? { audioUrl, pathname: fallback.pathname } : undefined;
}

async function finalizeAudio(body: FinalizeBody) {
  try {
    createAudioTokenPolicy(body.blob.pathname, body.songId);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Audio upload path is invalid",
        cleanupRequired: {
          audioUrl: body.blob.url,
          pathname: body.blob.pathname,
        },
      },
      { status: 400 },
    );
  }

  let stored;
  try {
    stored = await verifyUploadedJukeboxAudio(
      body.blob.url,
      body.blob.pathname,
    );
  } catch (error) {
    const cleanup = await cleanupJukeboxAudio({
      audioUrl: body.blob.url,
      pathname: body.blob.pathname,
      reason: "storage_verification_failed",
    });
    const detail = cleanupRequired(cleanup, body.blob);
    return NextResponse.json(
      {
        error:
          error instanceof AudioStorageConfigurationError
            ? error.message
            : "Uploaded audio could not be verified",
        cleanupStatus: cleanup.status,
        ...(detail ? { cleanupRequired: detail } : {}),
      },
      {
        status:
          error instanceof AudioStorageConfigurationError ? 503 : 400,
      },
    );
  }

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
    const detail = cleanupRequired(cleanup, body.blob);
    const message =
      error instanceof AudioUploadValidationError
        ? error.message
        : "Audio metadata could not be verified";
    return NextResponse.json(
      { error: message, ...(detail ? { cleanupRequired: detail } : {}) },
      { status: 400 },
    );
  }

  let currentSong;
  try {
    currentSong = await prisma.song.findUnique({
      where: { id: body.songId },
      select: { audioUrl: true, audioStoragePath: true },
    });
  } catch {
    const cleanup = await cleanupJukeboxAudio({
      audioUrl: body.blob.url,
      pathname: body.blob.pathname,
      reason: "song_lookup_failed",
    });
    const detail = cleanupRequired(cleanup, body.blob);
    return NextResponse.json(
      {
        error: "Song could not be verified",
        cleanupStatus: cleanup.status,
        ...(detail ? { cleanupRequired: detail } : {}),
      },
      { status: 500 },
    );
  }
  if (!currentSong) {
    const cleanup = await cleanupJukeboxAudio({
      audioUrl: body.blob.url,
      pathname: body.blob.pathname,
      reason: "song_missing",
    });
    const detail = cleanupRequired(cleanup, body.blob);
    return NextResponse.json(
      { error: "Song not found", ...(detail ? { cleanupRequired: detail } : {}) },
      { status: 404 },
    );
  }

  let updateCount: number;
  try {
    const update = await prisma.song.updateMany({
      where: {
        id: body.songId,
        audioUrl: currentSong.audioUrl,
        audioStoragePath: currentSong.audioStoragePath,
      },
      data: {
        audioUrl: body.blob.url,
        audioStoragePath: body.blob.pathname,
        durationSeconds,
      },
    });
    updateCount = update.count;
  } catch {
    const cleanup = await cleanupJukeboxAudio({
      audioUrl: body.blob.url,
      pathname: body.blob.pathname,
      reason: "database_update_failed",
    });
    const detail = cleanupRequired(cleanup, body.blob);
    return NextResponse.json(
      { error: "Audio could not be attached", ...(detail ? { cleanupRequired: detail } : {}) },
      { status: 500 },
    );
  }

  let cas;
  try {
    cas = await settleAudioCasResult(
      updateCount,
      {
        audioUrl: body.blob.url,
        pathname: body.blob.pathname,
        reason: "concurrent_finalization_lost",
      },
      () =>
        prisma.song.findUnique({
          where: { id: body.songId },
          select: { audioUrl: true, audioStoragePath: true },
        }),
      cleanupJukeboxAudio,
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Concurrent audio update could not be resolved; retry finalization with the same uploaded Blob",
      },
      { status: 503 },
    );
  }
  if (cas.status === "conflict") {
    const detail = cleanupRequired(cas.cleanup, body.blob);
    return NextResponse.json(
      {
        error: "Another audio update won; this upload was not attached",
        cleanupStatus: cas.cleanup.status,
        ...(detail ? { cleanupRequired: detail } : {}),
      },
      { status: 409 },
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
    ? cleanupRequired(replacedAudioCleanup, {
        audioUrl: currentSong.audioUrl!,
        pathname: currentSong.audioStoragePath!,
      })
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
      try {
        return finalizeAudio(parseFinalizeBody(body));
      } catch (error) {
        const rawBlob = (body as { blob?: unknown }).blob;
        const cleanupDetail =
          rawBlob &&
          typeof rawBlob === "object" &&
          typeof (rawBlob as { url?: unknown }).url === "string" &&
          typeof (rawBlob as { pathname?: unknown }).pathname === "string"
            ? {
                audioUrl: (rawBlob as { url: string }).url,
                pathname: (rawBlob as { pathname: string }).pathname,
              }
            : undefined;
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Audio finalization data is invalid",
            ...(cleanupDetail
              ? { cleanupRequired: cleanupDetail }
              : {}),
          },
          { status: 400 },
        );
      }
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

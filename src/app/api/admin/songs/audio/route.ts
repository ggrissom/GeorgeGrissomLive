import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

import {
  AudioUploadValidationError,
  readAudioDuration,
  validateAudioUpload,
} from "./metadata";
import {
  AudioStorageConfigurationError,
  deleteOwnedJukeboxAudio,
  uploadJukeboxAudio,
} from "./storage";

export const runtime = "nodejs";

function validateSongId(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AudioUploadValidationError("Song id is required");
  }
  return value.trim();
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const songId = validateSongId(form.get("songId"));
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AudioUploadValidationError("Choose an audio file");
    }
    validateAudioUpload(file);

    const currentSong = await prisma.song.findUnique({
      where: { id: songId },
      select: { audioUrl: true },
    });
    if (!currentSong) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const durationSeconds = await readAudioDuration(file);
    const uploaded = await uploadJukeboxAudio(songId, file);

    try {
      await prisma.song.update({
        where: { id: songId },
        data: { audioUrl: uploaded.url, durationSeconds },
      });
    } catch (error) {
      await deleteOwnedJukeboxAudio(uploaded.url).catch(() => undefined);
      throw error;
    }

    if (currentSong.audioUrl && currentSong.audioUrl !== uploaded.url) {
      await deleteOwnedJukeboxAudio(currentSong.audioUrl).catch(() => {
        console.error("Unable to remove replaced jukebox audio object");
      });
    }

    return NextResponse.json({ audioUrl: uploaded.url, durationSeconds });
  } catch (error) {
    if (error instanceof AudioUploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AudioStorageConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Jukebox audio upload failed");
    return NextResponse.json({ error: "Audio upload failed" }, { status: 500 });
  }
}

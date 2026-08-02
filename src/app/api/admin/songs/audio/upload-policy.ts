import {
  MAX_AUDIO_BYTES,
  SUPPORTED_AUDIO_MIME_TYPES,
} from "./metadata";

export class AudioUploadPolicyError extends Error {}

function safeFileName(name: string): string {
  return (
    name
      .trim()
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "audio"
  );
}

export function createAudioUploadPath(
  songId: string,
  fileName: string,
  uploadId = crypto.randomUUID(),
): string {
  return `jukebox-audio/${encodeURIComponent(songId)}/${uploadId}-${safeFileName(fileName)}`;
}

export function parseAudioClientPayload(clientPayload: string | null): {
  songId: string;
} {
  try {
    const payload = JSON.parse(clientPayload || "null") as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("invalid payload");
    }
    const songId = (payload as { songId?: unknown }).songId;
    if (typeof songId !== "string" || !songId.trim()) {
      throw new Error("invalid song id");
    }
    return { songId: songId.trim() };
  } catch {
    throw new AudioUploadPolicyError("Song id is required");
  }
}

export function createAudioTokenPolicy(
  pathname: string,
  songId: string,
  reservationId: string,
) {
  assertAudioUploadPath(pathname, songId);
  return {
    allowedContentTypes: [...SUPPORTED_AUDIO_MIME_TYPES],
    maximumSizeInBytes: MAX_AUDIO_BYTES,
    addRandomSuffix: false,
    allowOverwrite: false,
    tokenPayload: JSON.stringify({ reservationId, songId, pathname }),
  };
}

export function assertAudioUploadPath(pathname: string, songId: string) {
  const prefix = `jukebox-audio/${encodeURIComponent(songId)}/`;
  const fileName = pathname.slice(prefix.length);
  if (
    !pathname.startsWith(prefix) ||
    !fileName ||
    fileName.includes("/") ||
    !/\.(mp3|wav)$/i.test(fileName)
  ) {
    throw new AudioUploadPolicyError("Audio upload path is invalid");
  }
}

export function parseAudioTokenPayload(tokenPayload: string | null | undefined): {
  reservationId: string;
  songId: string;
  pathname: string;
} {
  try {
    const payload = JSON.parse(tokenPayload || "null") as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("invalid payload");
    }
    const value = payload as Record<string, unknown>;
    if (
      typeof value.reservationId !== "string" ||
      !value.reservationId.trim() ||
      typeof value.songId !== "string" ||
      !value.songId.trim() ||
      typeof value.pathname !== "string" ||
      !value.pathname
    ) {
      throw new Error("invalid upload tracking payload");
    }
    return {
      reservationId: value.reservationId.trim(),
      songId: value.songId.trim(),
      pathname: value.pathname,
    };
  } catch {
    throw new AudioUploadPolicyError("Audio upload tracking data is invalid");
  }
}

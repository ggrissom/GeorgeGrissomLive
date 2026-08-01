import crypto from "node:crypto";

const AUDIO_PREFIX = "/jukebox-audio/";
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export class AudioStorageConfigurationError extends Error {}

function blobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new AudioStorageConfigurationError(
      "Audio storage is not configured",
    );
  }
  return token;
}

function safeFileName(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "audio"
  );
}

export function isOwnedJukeboxAudioUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.hostname.endsWith(BLOB_HOST_SUFFIX) &&
      url.pathname.startsWith(AUDIO_PREFIX)
    );
  } catch {
    return false;
  }
}

export async function uploadJukeboxAudio(songId: string, file: File) {
  const { put } = await import("@vercel/blob");
  const pathname = `jukebox-audio/${encodeURIComponent(songId)}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  return put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
    token: blobToken(),
  });
}

export async function deleteOwnedJukeboxAudio(
  audioUrl: string | null | undefined,
): Promise<boolean> {
  if (!audioUrl || !isOwnedJukeboxAudioUrl(audioUrl)) return false;
  const { del } = await import("@vercel/blob");
  await del(audioUrl, { token: blobToken() });
  return true;
}

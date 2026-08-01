export const MAX_AUDIO_BYTES = 200 * 1024 * 1024;

const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
]);

export class AudioUploadValidationError extends Error {}

export function validateAudioUpload(
  file: Pick<File, "size" | "type">,
): void {
  if (file.size < 1) {
    throw new AudioUploadValidationError("Choose a non-empty audio file");
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new AudioUploadValidationError("Audio files must be 200 MB or smaller");
  }
  if (!AUDIO_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new AudioUploadValidationError("Choose an MP3 or WAV audio file");
  }
}

export function normalizeDuration(seconds: number | null): number | null {
  if (seconds === null) return null;
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new AudioUploadValidationError("Audio duration is invalid");
  }
  return Math.round(seconds);
}

export async function readAudioDuration(file: File): Promise<number> {
  try {
    const { parseBlob } = await import("music-metadata");
    const metadata = await parseBlob(file, { duration: true, skipCovers: true });
    const duration = normalizeDuration(metadata.format.duration ?? null);
    if (duration === null) throw new Error("missing duration");
    return duration;
  } catch (error) {
    if (error instanceof AudioUploadValidationError) throw error;
    throw new AudioUploadValidationError("Audio metadata could not be read");
  }
}

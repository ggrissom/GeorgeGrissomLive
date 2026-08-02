import type { AudioCleanupResult, AudioCleanupTask } from "./cleanup-workflow";
import {
  AudioUploadPolicyError,
  assertAudioUploadPath,
  parseAudioTokenPayload,
} from "./upload-policy";

export type CompletedAudioUploadDescriptor = {
  reservationId: string;
  songId: string;
  pathname: string;
  audioUrl: string;
};

export function isBlobUploadCompletionBody(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as { type?: unknown }).type === "blob.upload-completed",
  );
}

export async function recordCompletedAudioUpload(
  completed: {
    blob: { url: string; pathname: string };
    tokenPayload?: string | null;
  },
  record: (descriptor: CompletedAudioUploadDescriptor) => Promise<void>,
): Promise<CompletedAudioUploadDescriptor> {
  const issued = parseAudioTokenPayload(completed.tokenPayload);
  assertAudioUploadPath(issued.pathname, issued.songId);
  if (completed.blob.pathname !== issued.pathname) {
    throw new AudioUploadPolicyError(
      "Completed audio path does not match its upload reservation",
    );
  }
  if (typeof completed.blob.url !== "string" || !completed.blob.url.trim()) {
    throw new AudioUploadPolicyError("Completed audio URL is invalid");
  }
  const descriptor = {
    reservationId: issued.reservationId,
    songId: issued.songId,
    pathname: issued.pathname,
    audioUrl: completed.blob.url,
  };
  await record(descriptor);
  return descriptor;
}

export async function settleExpiredAudioUpload(
  reservation: {
    songId: string;
    pathname: string;
    audioUrl: string | null;
  },
  readCurrentAudio: () => Promise<{
    audioUrl: string | null;
    audioStoragePath: string | null;
  } | null>,
  cleanup: (task: AudioCleanupTask) => Promise<AudioCleanupResult>,
): Promise<
  | { status: "empty" }
  | { status: "attached" }
  | { status: "cleaned"; cleanupStatus: "deleted" | "queued" }
  | { status: "retry"; cleanup: AudioCleanupResult }
> {
  if (!reservation.audioUrl) return { status: "empty" };
  const current = await readCurrentAudio();
  if (
    current?.audioUrl === reservation.audioUrl &&
    current.audioStoragePath === reservation.pathname
  ) {
    return { status: "attached" };
  }

  const result = await cleanup({
    audioUrl: reservation.audioUrl,
    pathname: reservation.pathname,
    reason: "upload_reservation_expired",
  });
  if (result.status === "deleted" || result.status === "queued") {
    return { status: "cleaned", cleanupStatus: result.status };
  }
  return { status: "retry", cleanup: result };
}

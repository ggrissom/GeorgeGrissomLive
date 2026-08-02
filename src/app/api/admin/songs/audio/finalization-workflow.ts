import type {
  AudioCleanupResult,
  AudioCleanupTask,
} from "./cleanup-workflow";

export async function settleAudioCasResult(
  updatedCount: number,
  losingUpload: AudioCleanupTask & { pathname: string },
  readCurrentAudio: () => Promise<{
    audioUrl: string | null;
    audioStoragePath: string | null;
  } | null>,
  cleanup: (task: AudioCleanupTask) => Promise<AudioCleanupResult>,
): Promise<
  | { status: "attached" }
  | { status: "idempotent" }
  | { status: "conflict"; cleanup: AudioCleanupResult }
> {
  if (updatedCount === 1) return { status: "attached" };
  const currentAudio = await readCurrentAudio();
  if (
    currentAudio?.audioUrl === losingUpload.audioUrl &&
    currentAudio.audioStoragePath === losingUpload.pathname
  ) {
    return { status: "idempotent" };
  }
  return {
    status: "conflict",
    cleanup: await cleanup(losingUpload),
  };
}

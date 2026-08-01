import type {
  AudioCleanupResult,
  AudioCleanupTask,
} from "./cleanup-workflow";

export async function settleAudioCasResult(
  updatedCount: number,
  losingUpload: AudioCleanupTask & { pathname: string },
  cleanup: (task: AudioCleanupTask) => Promise<AudioCleanupResult>,
): Promise<
  | { status: "attached" }
  | { status: "conflict"; cleanup: AudioCleanupResult }
> {
  if (updatedCount === 1) return { status: "attached" };
  return {
    status: "conflict",
    cleanup: await cleanup(losingUpload),
  };
}

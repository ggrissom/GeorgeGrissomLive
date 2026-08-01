export type AudioCleanupTask = {
  audioUrl: string;
  pathname: string | null;
  reason: string;
};

export type AudioCleanupResult =
  | { status: "deleted" | "queued" | "skipped" }
  | { status: "untracked"; audioUrl: string; pathname: string };

export async function settleAudioCleanup(
  task: AudioCleanupTask,
  dependencies: {
    remove: (audioUrl: string, pathname: string) => Promise<boolean>;
    enqueue: (task: AudioCleanupTask & { pathname: string }) => Promise<void>;
  },
): Promise<AudioCleanupResult> {
  if (!task.pathname) return { status: "skipped" };
  try {
    const removed = await dependencies.remove(task.audioUrl, task.pathname);
    return { status: removed ? "deleted" : "skipped" };
  } catch {
    try {
      await dependencies.enqueue({ ...task, pathname: task.pathname });
      return { status: "queued" };
    } catch {
      return {
        status: "untracked",
        audioUrl: task.audioUrl,
        pathname: task.pathname,
      };
    }
  }
}

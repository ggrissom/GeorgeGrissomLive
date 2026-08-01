import { prisma } from "@/lib/db";

import {
  type AudioCleanupResult,
  type AudioCleanupTask,
  settleAudioCleanup,
} from "./cleanup-workflow";
import { deleteOwnedJukeboxAudio } from "./storage";

async function enqueueAudioCleanup(
  task: AudioCleanupTask & { pathname: string },
): Promise<void> {
  await prisma.audioCleanup.upsert({
    where: { audioUrl: task.audioUrl },
    create: {
      audioUrl: task.audioUrl,
      pathname: task.pathname,
      reason: task.reason,
      attempts: 1,
      lastError: "Immediate cleanup failed",
    },
    update: {
      pathname: task.pathname,
      reason: task.reason,
      attempts: { increment: 1 },
      lastError: "Immediate cleanup failed",
    },
  });
}

export function cleanupJukeboxAudio(
  task: AudioCleanupTask,
): Promise<AudioCleanupResult> {
  return settleAudioCleanup(task, {
    remove: deleteOwnedJukeboxAudio,
    enqueue: enqueueAudioCleanup,
  });
}

export async function retryPendingAudioCleanup(limit = 5): Promise<void> {
  const pending = await prisma.audioCleanup.findMany({
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  for (const task of pending) {
    try {
      const removed = await deleteOwnedJukeboxAudio(
        task.audioUrl,
        task.pathname,
      );
      if (!removed) throw new Error("Ownership verification failed");
      await prisma.audioCleanup.delete({ where: { id: task.id } });
    } catch {
      await prisma.audioCleanup.update({
        where: { id: task.id },
        data: {
          attempts: { increment: 1 },
          lastError: "Cleanup retry failed",
        },
      });
    }
  }
}

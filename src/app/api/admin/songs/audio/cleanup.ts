import { prisma } from "@/lib/db";

import {
  type AudioCleanupResult,
  type AudioCleanupTask,
  settleAudioCleanup,
} from "./cleanup-workflow";
import { deleteOwnedJukeboxAudio } from "./storage";
import {
  cleanupLeaseUntil,
  cleanupRetryState,
} from "./cleanup-retry-policy";
import { settleExpiredAudioUpload } from "./upload-reservation-workflow";

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
      nextAttemptAt: new Date(),
    },
    update: {
      pathname: task.pathname,
      reason: task.reason,
      attempts: { increment: 1 },
      lastError: "Immediate cleanup failed",
      nextAttemptAt: new Date(),
      leaseUntil: null,
      terminalAt: null,
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
  const now = new Date();
  const leaseUntil = cleanupLeaseUntil(now);
  const candidates = await prisma.audioCleanup.findMany({
    where: {
      terminalAt: null,
      nextAttemptAt: { lte: now },
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
    },
    orderBy: [{ nextAttemptAt: "asc" }, { attempts: "asc" }],
    take: Math.max(limit * 4, limit),
  });
  const claimed: typeof candidates = [];
  for (const task of candidates) {
    if (claimed.length >= limit) break;
    const claim = await prisma.audioCleanup.updateMany({
      where: {
        id: task.id,
        terminalAt: null,
        nextAttemptAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      data: { leaseUntil },
    });
    if (claim.count === 1) claimed.push(task);
  }

  for (const task of claimed) {
    try {
      const removed = await deleteOwnedJukeboxAudio(
        task.audioUrl,
        task.pathname,
      );
      if (!removed) throw new Error("Ownership verification failed");
      await prisma.audioCleanup.delete({ where: { id: task.id } });
    } catch {
      const attempts = task.attempts + 1;
      const retry = cleanupRetryState(attempts, new Date());
      await prisma.audioCleanup
        .updateMany({
          where: { id: task.id, leaseUntil },
          data: {
            attempts,
            lastError: "Cleanup retry failed",
            nextAttemptAt: retry.nextAttemptAt,
            terminalAt: retry.terminalAt,
            leaseUntil: null,
          },
        })
        .catch(() => {
          console.error("Unable to update audio cleanup retry state");
        });
    }
  }

  await retryExpiredAudioUploadReservations(limit);
}

async function retryExpiredAudioUploadReservations(limit: number): Promise<void> {
  const now = new Date();
  const leaseUntil = cleanupLeaseUntil(now);
  const candidates = await prisma.audioUploadReservation.findMany({
    where: {
      status: { not: "finalized" },
      expiresAt: { lte: now },
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
    },
    orderBy: { expiresAt: "asc" },
    take: Math.max(limit * 4, limit),
  });
  const claimed: typeof candidates = [];
  for (const reservation of candidates) {
    if (claimed.length >= limit) break;
    const claim = await prisma.audioUploadReservation.updateMany({
      where: {
        id: reservation.id,
        status: { not: "finalized" },
        expiresAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      data: { leaseUntil },
    });
    if (claim.count === 1) claimed.push(reservation);
  }

  for (const reservation of claimed) {
    try {
      const result = await settleExpiredAudioUpload(
        reservation,
        () => prisma.song.findUnique({
          where: { id: reservation.songId },
          select: { audioUrl: true, audioStoragePath: true },
        }),
        cleanupJukeboxAudio,
      );
      if (result.status === "attached") {
        await prisma.audioUploadReservation.updateMany({
          where: { id: reservation.id, leaseUntil },
          data: {
            status: "finalized",
            finalizedAt: new Date(),
            leaseUntil: null,
            lastError: null,
          },
        });
      } else if (result.status === "empty" || result.status === "cleaned") {
        await prisma.audioUploadReservation.deleteMany({
          where: { id: reservation.id, leaseUntil },
        });
      } else {
        await prisma.audioUploadReservation.updateMany({
          where: { id: reservation.id, leaseUntil },
          data: {
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            leaseUntil: null,
            lastError: "Expired upload cleanup could not be tracked",
          },
        });
      }
    } catch {
      await prisma.audioUploadReservation.updateMany({
        where: { id: reservation.id, leaseUntil },
        data: {
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          leaseUntil: null,
          lastError: "Expired upload cleanup failed",
        },
      }).catch(() => {
        console.error("Unable to update expired audio upload reservation");
      });
    }
  }
}

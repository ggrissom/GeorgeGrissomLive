ALTER TABLE "AudioCleanup"
ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "leaseUntil" TIMESTAMP(3),
ADD COLUMN "terminalAt" TIMESTAMP(3);

CREATE INDEX "AudioCleanup_terminalAt_nextAttemptAt_idx"
ON "AudioCleanup"("terminalAt", "nextAttemptAt");

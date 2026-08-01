ALTER TABLE "Song" ADD COLUMN "audioStoragePath" TEXT;

CREATE TABLE "AudioCleanup" (
    "id" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AudioCleanup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AudioCleanup_audioUrl_key" ON "AudioCleanup"("audioUrl");

CREATE TABLE "AudioUploadReservation" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "audioUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "leaseUntil" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioUploadReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AudioUploadReservation_pathname_key"
ON "AudioUploadReservation"("pathname");

CREATE UNIQUE INDEX "AudioUploadReservation_audioUrl_key"
ON "AudioUploadReservation"("audioUrl");

CREATE INDEX "AudioUploadReservation_status_expiresAt_idx"
ON "AudioUploadReservation"("status", "expiresAt");

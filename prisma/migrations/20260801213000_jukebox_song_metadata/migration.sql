ALTER TABLE "Song" ADD COLUMN "album" TEXT;
ALTER TABLE "Song" ADD COLUMN "durationSeconds" INTEGER;
ALTER TABLE "Song" ADD COLUMN "jukeboxOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Song_isPublic_jukeboxOrder_title_idx"
ON "Song"("isPublic", "jukeboxOrder", "title");

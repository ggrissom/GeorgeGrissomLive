import { prisma } from "@/lib/db";
import { AUDIO_CATALOG } from "@/lib/audio-catalog";

/**
 * Production-safe canonical audio repair.
 *
 * It never deletes songs and never performs destructive deployment seeding.
 * Missing canonical tracks are created, while existing canonical rows are only
 * repaired when publication or audio-delivery fields would prevent playback.
 */
export async function ensureAudioCatalogSongs() {
  const slugs = AUDIO_CATALOG.map(track => track.slug);
  if (!slugs.length) return;

  const existing = await prisma.song.findMany({
    where: { slug: { in: slugs } },
    select: {
      id: true,
      slug: true,
      isPublic: true,
      previewUrl: true,
      audioPath: true,
      downloadPath: true,
      durationSeconds: true
    }
  });
  const bySlug = new Map(existing.flatMap(song => song.slug ? [[song.slug, song] as const] : []));

  for (const track of AUDIO_CATALOG) {
    const song = bySlug.get(track.slug);
    if (!song) {
      await prisma.song.create({
        data: {
          slug: track.slug,
          title: track.title,
          artist: "George Grissom",
          album: track.album,
          durationSeconds: track.durationSeconds,
          previewUrl: `/api/preview/${track.slug}`,
          audioPath: track.fullPath,
          downloadPath: track.fullPath,
          audioUrl: null,
          downloadPriceCents: 200,
          requestable: true,
          publicShortlist: true,
          paidCatalog: true,
          minTipCents: 0,
          freePlayLimit: 3,
          isPublic: true
        }
      });
      continue;
    }

    const expectedPreview = `/api/preview/${track.slug}`;
    if (
      !song.isPublic ||
      song.previewUrl !== expectedPreview ||
      song.audioPath !== track.fullPath ||
      song.downloadPath !== track.fullPath ||
      song.durationSeconds !== track.durationSeconds
    ) {
      await prisma.song.update({
        where: { id: song.id },
        data: {
          isPublic: true,
          previewUrl: expectedPreview,
          audioPath: track.fullPath,
          downloadPath: track.fullPath,
          durationSeconds: track.durationSeconds,
          requestable: true,
          paidCatalog: true
        }
      });
    }
  }
}

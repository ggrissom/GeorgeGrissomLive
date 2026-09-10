import { prisma } from "@/lib/db";
import { AUDIO_CATALOG } from "@/lib/audio-catalog";

/**
 * Production-safe catalog repair: only creates canonical audio rows that are
 * missing from the database. Existing songs and their user/admin data are left
 * untouched. This prevents the jukebox from collapsing to the subset that
 * happened to be seeded previously without reintroducing destructive deploy
 * seeding.
 */
export async function ensureAudioCatalogSongs() {
  const slugs = AUDIO_CATALOG.map(track => track.slug);
  if (!slugs.length) return;

  const existing = await prisma.song.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true }
  });
  const existingSlugs = new Set(existing.map(song => song.slug).filter(Boolean));
  const missing = AUDIO_CATALOG.filter(track => !existingSlugs.has(track.slug));

  if (!missing.length) return;

  await prisma.song.createMany({
    data: missing.map(track => ({
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
    })),
    skipDuplicates: true
  });
}

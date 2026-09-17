import { prisma } from "@/lib/db";
import { PUBLIC_TRACKS } from "@/lib/public-track-catalog";

const CONFIG_VERSION = 1;

function normalizeSourceLinks(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  if (Array.isArray(value)) return { references: value };
  return {};
}

export async function ensurePublicPlayerCatalog() {
  for (const seed of PUBLIC_TRACKS) {
    const bySlug = await prisma.song.findUnique({ where: { slug: seed.slug } });
    const byTitle = bySlug
      ? null
      : await prisma.song.findFirst({
          where: {
            title: {
              in: [seed.title, ...(seed.aliases || [])]
            }
          }
        });

    const existing = bySlug || byTitle;
    const sourceLinks = normalizeSourceLinks(existing?.sourceLinks);
    const alreadyInitialized = Number(sourceLinks.publicPlayerConfigVersion || 0) >= CONFIG_VERSION;
    const nextSourceLinks = {
      ...sourceLinks,
      fullMp3DriveFileId: seed.fileId,
      publicPlayerConfigVersion: CONFIG_VERSION
    };

    if (!existing) {
      await prisma.song.create({
        data: {
          slug: seed.slug,
          title: seed.title,
          artist: seed.artist || "George Grissom",
          album: seed.season,
          sourceLinks: nextSourceLinks,
          requestable: true,
          publicShortlist: seed.defaultPublic,
          paidCatalog: false,
          isPublic: true
        }
      });
      continue;
    }

    const needsSourceUpdate = sourceLinks.fullMp3DriveFileId !== seed.fileId;
    if (alreadyInitialized && !needsSourceUpdate) continue;

    const data: any = {
      sourceLinks: nextSourceLinks
    };

    if (!existing.slug) data.slug = seed.slug;

    if (!alreadyInitialized) {
      data.title = seed.title;
      data.artist = seed.artist || existing.artist || "George Grissom";
      data.album = seed.season;
      data.publicShortlist = seed.defaultPublic;
      data.isPublic = true;
      data.paidCatalog = false;
    }

    await prisma.song.update({
      where: { id: existing.id },
      data
    });
  }
}

import { prisma } from "@/lib/db";
import { PUBLIC_TRACKS } from "@/lib/public-track-catalog";

const CONFIG_VERSION = 2;

function normalizeSourceLinks(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  if (Array.isArray(value)) return { references: value };
  return {};
}

function primaryAlbum(seasons: string[]) {
  if (seasons.includes("A Taste For Crow")) return "A Taste For Crow";
  return seasons[0] || "Unsorted";
}

async function hideLegacyDuplicateRows(seed: (typeof PUBLIC_TRACKS)[number], keepId: string) {
  await prisma.song.updateMany({
    where: {
      id: { not: keepId },
      slug: null,
      title: { in: [seed.title, ...(seed.aliases || [])] },
      publicShortlist: true
    },
    data: { publicShortlist: false }
  });
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
    const configuredVersion = Number(sourceLinks.publicPlayerConfigVersion || 0);
    const nextSourceLinks = {
      ...sourceLinks,
      fullMp3DriveFileId: seed.fileId,
      hostedFileName: seed.hostedFileName || sourceLinks.hostedFileName || null,
      publicPlayerSeasons: seed.seasons,
      publicPlayerConfigVersion: CONFIG_VERSION
    };

    if (!existing) {
      const created = await prisma.song.create({
        data: {
          slug: seed.slug,
          title: seed.title,
          artist: seed.artist || "George Grissom",
          album: primaryAlbum(seed.seasons),
          sourceLinks: nextSourceLinks,
          requestable: true,
          publicShortlist: seed.defaultPublic,
          paidCatalog: false,
          isPublic: true
        }
      });
      await hideLegacyDuplicateRows(seed, created.id);
      continue;
    }

    const needsSourceUpdate =
      sourceLinks.fullMp3DriveFileId !== seed.fileId ||
      sourceLinks.hostedFileName !== (seed.hostedFileName || null) ||
      JSON.stringify(sourceLinks.publicPlayerSeasons || []) !== JSON.stringify(seed.seasons);

    if (configuredVersion >= CONFIG_VERSION && !needsSourceUpdate) {
      await hideLegacyDuplicateRows(seed, existing.id);
      continue;
    }

    const data: any = {
      sourceLinks: nextSourceLinks
    };

    if (!existing.slug) data.slug = seed.slug;

    if (configuredVersion < CONFIG_VERSION) {
      data.title = seed.title;
      data.artist = seed.artist || existing.artist || "George Grissom";
      data.album = primaryAlbum(seed.seasons);
      data.publicShortlist = seed.defaultPublic;
      data.isPublic = true;
      data.paidCatalog = false;
    }

    await prisma.song.update({
      where: { id: existing.id },
      data
    });
    await hideLegacyDuplicateRows(seed, existing.id);
  }
}

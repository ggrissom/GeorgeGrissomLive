import { PrismaClient } from "@prisma/client";
import { AUDIO_CATALOG } from "../src/lib/audio-catalog";

const prisma = new PrismaClient();

async function main() {
  for (const track of AUDIO_CATALOG) {
    const existing = await prisma.song.findFirst({
      where: {
        OR: [
          { slug: track.slug },
          { title: track.title }
        ]
      },
      orderBy: { updatedAt: "desc" }
    });

    const data = {
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
    };

    if (existing) {
      await prisma.song.update({
        where: { id: existing.id },
        data
      });
      continue;
    }

    await prisma.song.create({ data });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });

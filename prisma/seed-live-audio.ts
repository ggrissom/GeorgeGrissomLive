import { PrismaClient } from "@prisma/client";
import { AUDIO_CATALOG } from "../src/lib/audio-catalog";

const prisma = new PrismaClient();

async function main() {
  const activeSlugs = AUDIO_CATALOG.map(track => track.slug);

  await prisma.song.updateMany({
    where: {
      paidCatalog: true,
      slug: { notIn: activeSlugs }
    },
    data: {
      publicShortlist: false,
      requestable: false,
      isPublic: false
    }
  });

  for (const track of AUDIO_CATALOG) {
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

    await prisma.song.upsert({
      where: { slug: track.slug },
      update: data,
      create: data
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });

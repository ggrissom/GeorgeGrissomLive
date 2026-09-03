import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tracks = [
  ["one-question", "One Question", "SINGLE", 191.832],
  ["what-a-shame", "What a Shame", "SINGLE", 225.072],
  ["evangelina", "Evangelina", "SINGLE", 210.90907],
  ["grass-before-the-sickle", "Grass Before The Sickle", "SINGLE", 215.818833],
  ["light-under-the-moon", "Light Under The Moon", "SINGLE", 149.5562],
  ["need-the-cage", "Need the Cage", "SINGLE", 219.39225],
  ["nose-to-the-grindstone", "Nose to the Grindstone", "A Taste For Crow", 177.951043],
  ["old-macdonald", "Old MacDonald", "SINGLE", 178.222268],
  ["slow-dive", "Slow Dive", "SINGLE", 135.604535],
  ["the-seed", "The Seed", "SINGLE", 209.454542],
  ["white-house-road", "White House Road", "SINGLE", 254.112698],
  ["who-did-that-to-you", "Who Did That to You?", "SINGLE", 255.272729],
] as const;

async function main() {
  for (const [slug, title, album, durationSeconds] of tracks) {
    const data = {
      slug,
      title,
      artist: "George Grissom",
      album,
      durationSeconds,
      previewUrl: `/audio/previews/${slug}-preview.mp3`,
      audioPath: `private/audio/${slug}.mp3`,
      audioUrl: null,
      downloadPriceCents: 200,
      requestable: true,
      publicShortlist: true,
      paidCatalog: true,
      minTipCents: 0,
      freePlayLimit: 3,
      isPublic: true,
    };

    await prisma.song.upsert({
      where: { slug },
      update: data,
      create: data,
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tracks = [
  ["one-question", "One Question", "SINGLE", 191.832],
  ["what-a-shame", "What a Shame", "SINGLE", 226.549773],
  ["this-song-is-about-you", "This Song Is About You", "SINGLE", 221.425488],
  ["damnit-just-you-hold-on", "Damnit, Just You Hold On", "SINGLE", 159.069773],
  ["get-in-loser", "Get In Loser", "SINGLE", 257.014354],
  ["and-another-thing-screams", "And Another Thing", "SINGLE", 189.397846],
  ["nose-to-the-grindstone", "Nose to the Grindstone", "A Taste For Crow", 177.951043],
  ["evangelina", "Evangelina", "SINGLE", 210.90907],
  ["grass-before-the-sickle", "Grass Before The Sickle", "SINGLE", 215.818833],
  ["light-under-the-moon", "Light Under The Moon", "SINGLE", 149.5562],
  ["need-the-cage", "Need the Cage", "SINGLE", 219.39225],
  ["old-macdonald", "Old MacDonald", "SINGLE", 178.222268],
  ["slow-dive", "Slow Dive", "SINGLE", 135.604535],
  ["the-seed", "The Seed", "SINGLE", 209.454542],
  ["white-house-road", "White House Road", "SINGLE", 254.112698],
  ["who-did-that-to-you", "Who Did That to You?", "SINGLE", 255.272729]
] as const;

async function main() {
  for (const [slug, title, album, durationSeconds] of tracks) {
    const data = {
      slug,
      title,
      artist: "George Grissom",
      album,
      durationSeconds,
      previewUrl: `/api/preview/${slug}`,
      audioPath: `private/audio/mp3/${slug}.mp3`,
      downloadPath: `private/audio/wav/${slug}.wav`,
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
      where: { slug },
      update: data,
      create: data
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });

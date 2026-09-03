import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tracks = [
  { slug: "one-question", title: "One Question", album: "SINGLE", durationSeconds: 191.832 },
  { slug: "what-a-shame", title: "What a Shame", album: "SINGLE", durationSeconds: 225.072 },
  { slug: "evangelina", title: "Evangelina", album: "SINGLE", durationSeconds: 210.939 },
  { slug: "grass-before-the-sickle", title: "Grass Before The Sickle", album: "SINGLE", durationSeconds: 216.163 },
  { slug: "light-under-the-moon", title: "Light Under The Moon", album: "SINGLE", durationSeconds: 149.708 },
  { slug: "need-the-cage", title: "Need the Cage", album: "SINGLE", durationSeconds: 219.742 },
  { slug: "nose-to-the-grindstone", title: "Nose to the Grindstone", album: "A Taste For Crow", durationSeconds: 177.998 },
  { slug: "old-macdonald", title: "Old MacDonald", album: "SINGLE", durationSeconds: 178.260 },
  { slug: "slow-dive", title: "Slow Dive", album: "SINGLE", durationSeconds: 135.602 },
  { slug: "the-seed", title: "The Seed", album: "SINGLE", durationSeconds: 209.502 },
  { slug: "white-house-rd", title: "White House Rd - NonAttributable", album: "SINGLE", durationSeconds: 254.145 },
  { slug: "who-did-that-to-you", title: "Who Did That to You?", album: "SINGLE", durationSeconds: 255.321 }
];

async function main() {
  for (const track of tracks) {
    const data = {
      slug: track.slug,
      title: track.title,
      artist: "George Grissom",
      album: track.album,
      durationSeconds: track.durationSeconds,
      previewSeconds: 30,
      downloadPriceCents: 200,
      freePlayLimit: 3,
      previewUrl: `/previews/${track.slug}.mp3`,
      audioUrl: `/previews/${track.slug}.mp3`,
      privateAudioPath: `masters/${track.slug}.mp3`,
      paidCatalog: true,
      publicShortlist: true,
      requestable: true,
      isPublic: true
    };

    const existing = await prisma.song.findFirst({ where: { OR: [{ slug: track.slug }, { title: track.title }] } });
    if (existing) await prisma.song.update({ where: { id: existing.id }, data });
    else await prisma.song.create({ data });
  }
}

main()
  .then(() => console.log(`Seeded ${tracks.length} paid audio tracks.`))
  .finally(() => prisma.$disconnect());

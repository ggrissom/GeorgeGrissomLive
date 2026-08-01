import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tracks = [
  {
    title: "One Question",
    artist: "George Grissom",
    audioUrl: "/audio/one-question.mp3",
    metadataNote: "Album: SINGLE | Duration: 3:12",
  },
  {
    title: "What a Shame",
    artist: "George Grissom",
    audioUrl: "/audio/what-a-shame-vocals.mp3",
    metadataNote: "Album: SINGLE | Duration: 3:45",
  },
] as const;

async function main() {
  for (const track of tracks) {
    const existing = await prisma.song.findFirst({
      where: { title: track.title, artist: track.artist },
      select: { id: true },
    });

    const data = {
      title: track.title,
      artist: track.artist,
      genre: "Original",
      audioUrl: track.audioUrl,
      privateRehearsalNotes: track.metadataNote,
      requestable: true,
      publicShortlist: true,
      paidCatalog: false,
      minTipCents: 0,
      freePlayLimit: 2,
      isPublic: true,
    };

    if (existing) {
      await prisma.song.update({ where: { id: existing.id }, data });
    } else {
      await prisma.song.create({ data });
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.event.upsert({
    where: { id: "seed-event-1" },
    update: {},
    create: {
      id: "seed-event-1",
      title: "Live Acoustic Night",
      venueName: "Venue TBA",
      city: "Your Town",
      state: "CA",
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      notes: "Replace this with a real manually-entered show from the admin dashboard.",
      isPublic: true
    }
  });

  const songs = [
    { id: "seed-song-1", title: "Whiskey & Neon", artist: "George Grissom", album: "Neon Nights", jukeboxOrder: 10, genre: "Americana", mood: "Dive-bar soul", publicShortlist: true, paidCatalog: true, minTipCents: 25 },
    { id: "seed-song-2", title: "Sunday at the Winery", artist: "George Grissom", album: null, jukeboxOrder: 20, genre: "Acoustic", mood: "Daylight patio", publicShortlist: true, paidCatalog: true, minTipCents: 25 },
    { id: "seed-song-3", title: "From the Setlist", artist: "George Grissom", jukeboxOrder: 30, genre: "Live", mood: "Crowd favorite", publicShortlist: true, paidCatalog: true, minTipCents: 25 },
    { id: "seed-song-4", title: "Last Call Lullaby", artist: "George Grissom", jukeboxOrder: 40, genre: "Country/Soul", mood: "Late-night", publicShortlist: false, paidCatalog: true, minTipCents: 25 }
  ];

  for (const song of songs) {
    await prisma.song.upsert({
      where: { id: song.id },
      update: {},
      create: {
        ...song,
        requestable: true,
        tempoLabel: "medium",
        rightsStatus: "private_reference"
      }
    });
  }
  await prisma.setlist.upsert({
    where: { id: "seed-setlist-1" },
    update: {},
    create: {
      id: "seed-setlist-1",
      name: "Starter Acoustic Set",
      venueName: "Venue TBA",
      eventId: "seed-event-1",
      notes: "Private sample setlist. Duplicate this for a real show.",
      isPrivate: true,
      songs: {
        create: [
          { songId: "seed-song-1", position: 0 },
          { songId: "seed-song-2", position: 1 },
          { songId: "seed-song-3", position: 2 }
        ]
      }
    }
  });

}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

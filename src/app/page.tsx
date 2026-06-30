import { prisma } from "@/lib/db";
import SiteShell from "./site-shell";

export default async function Home() {
  const [events, songs] = await Promise.all([
    prisma.event.findMany({
      where: { isPublic: true, startsAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 12) } },
      orderBy: { startsAt: "asc" },
      take: 20
    }),
    prisma.song.findMany({
      where: { publicShortlist: true },
      orderBy: { title: "asc" },
      take: 50
    })
  ]);

  return (
    <SiteShell
      initialEvents={events.map(event => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt?.toISOString() || null,
        venueName: event.venueName,
        city: event.city,
        state: event.state,
        notes: event.notes
      }))}
      initialSongs={songs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        genre: song.genre,
        mood: song.mood,
        tempoLabel: song.tempoLabel,
        audioUrl: song.audioUrl,
        requestable: song.requestable,
        publicShortlist: song.publicShortlist,
        paidCatalog: song.paidCatalog,
        minTipCents: song.minTipCents,
        freePlayLimit: song.freePlayLimit
      }))}
    />
  );
}

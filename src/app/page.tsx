export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { publicEventsFromPerformanceCalendar } from "@/lib/public-events";
import SiteShell from "./site-shell";

export default async function Home() {
  const [events, songs] = await Promise.all([
    publicEventsFromPerformanceCalendar(50),
    prisma.song.findMany({
      where: { publicShortlist: true },
      orderBy: { title: "asc" },
      take: 100
    })
  ]);

  return (
    <SiteShell
      initialEvents={events.map(event => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt || null,
        venueName: event.venueName,
        city: event.city,
        state: event.state,
        notes: event.notes
      }))}
      initialSongs={songs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        genre: song.genre,
        mood: song.mood,
        tempoLabel: song.tempoLabel,
        audioUrl: song.previewUrl || song.audioUrl,
        previewUrl: song.previewUrl,
        durationSeconds: song.durationSeconds,
        requestable: song.requestable,
        publicShortlist: song.publicShortlist,
        paidCatalog: song.paidCatalog,
        downloadPriceCents: song.downloadPriceCents,
        previewSeconds: song.previewSeconds,
        minTipCents: song.minTipCents,
        freePlayLimit: song.freePlayLimit
      }))}
    />
  );
}

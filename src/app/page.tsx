export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { toPublicJukeboxSong } from "@/lib/jukebox";
import { publicEventsFromPerformanceCalendar } from "@/lib/public-events";
import SiteShell from "./site-shell";

export default async function Home() {
  const [events, songs] = await Promise.all([
    publicEventsFromPerformanceCalendar(50),
    prisma.song.findMany({
      where: { isPublic: true },
      orderBy: [{ jukeboxOrder: "asc" }, { title: "asc" }],
      take: 100,
    }),
  ]);
  const jukeboxSongs = songs.map(toPublicJukeboxSong);

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
        notes: event.notes,
      }))}
      initialSongs={songs.map((song, index) => ({
        ...jukeboxSongs[index],
        genre: song.genre,
        mood: song.mood,
        tempoLabel: song.tempoLabel,
        minTipCents: song.minTipCents,
        freePlayLimit: song.freePlayLimit,
      }))}
    />
  );
}

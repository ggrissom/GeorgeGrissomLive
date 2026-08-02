export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import {
  toHomepageJukeboxSong,
  toPublicRequestSong,
} from "@/lib/homepage-jukebox";
import { publicEventsFromPerformanceCalendar } from "@/lib/public-events";
import SiteShell from "./site-shell";

export default async function Home() {
  const [events, jukeboxSongs, requestSongs] = await Promise.all([
    publicEventsFromPerformanceCalendar(50),
    prisma.song.findMany({
      where: { isPublic: true },
      orderBy: [{ jukeboxOrder: "asc" }, { title: "asc" }],
      take: 100,
    }),
    prisma.song.findMany({
      where: { publicShortlist: true, requestable: true },
      orderBy: { title: "asc" },
      take: 100,
    }),
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
        notes: event.notes,
      }))}
      initialJukeboxSongs={jukeboxSongs.map(toHomepageJukeboxSong)}
      initialRequestSongs={requestSongs.map(toPublicRequestSong)}
    />
  );
}

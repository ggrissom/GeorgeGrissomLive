export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ensurePublicPlayerCatalog } from "@/lib/ensure-public-player-catalog";
import { normalizePlayerSeason } from "@/lib/public-track-catalog";
import { publicEventsFromPerformanceCalendar } from "@/lib/public-events";
import SiteShell from "./site-shell";

export default async function Home() {
  await ensurePublicPlayerCatalog();

  const [events, songs] = await Promise.all([
    publicEventsFromPerformanceCalendar(50),
    prisma.song.findMany({
      where: {
        isPublic: true,
        publicShortlist: true
      },
      orderBy: [
        { album: "asc" },
        { title: "asc" }
      ]
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
      tracks={songs.map(song => ({
        id: song.id,
        slug: song.slug,
        title: song.title,
        season: normalizePlayerSeason(song.album)
      }))}
    />
  );
}

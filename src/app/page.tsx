export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ensurePublicPlayerCatalog } from "@/lib/ensure-public-player-catalog";
import { normalizePlayerSeasons } from "@/lib/public-track-catalog";
import { publicEventsFromPerformanceCalendar } from "@/lib/public-events";
import SiteShell from "./site-shell";

function sourceLinksObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

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
      tracks={songs.map(song => {
        const links = sourceLinksObject(song.sourceLinks);
        return {
          id: song.id,
          slug: song.slug,
          title: song.title,
          seasons: normalizePlayerSeasons(links.publicPlayerSeasons, song.album)
        };
      })}
    />
  );
}

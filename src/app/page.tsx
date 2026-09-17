export const dynamic = "force-dynamic";

import { PUBLIC_TRACKS } from "@/lib/public-track-catalog";
import { publicEventsFromPerformanceCalendar } from "@/lib/public-events";
import SiteShell from "./site-shell";

export default async function Home() {
  const events = await publicEventsFromPerformanceCalendar(50);

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
      tracks={PUBLIC_TRACKS.map(({ slug, title, era }) => ({ slug, title, era }))}
    />
  );
}

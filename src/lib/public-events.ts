import { prisma } from "@/lib/db";
import {
  isGoogleCalendarConfigured,
  listGooglePerformanceEvents,
  type PublicCalendarEvent
} from "@/lib/google-calendar";

export async function localPublicEvents(limit = 50): Promise<PublicCalendarEvent[]> {
  const events = await prisma.event.findMany({
    where: {
      isPublic: true,
      startsAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 12) }
    },
    orderBy: { startsAt: "asc" },
    take: limit
  });

  return events.map(event => ({
    id: event.id,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() || null,
    venueName: event.venueName,
    city: event.city,
    state: event.state,
    notes: event.notes,
    source: "local"
  }));
}

export async function publicEventsFromPerformanceCalendar(limit = 50): Promise<PublicCalendarEvent[]> {
  if (!isGoogleCalendarConfigured()) {
    return localPublicEvents(limit);
  }

  try {
    return await listGooglePerformanceEvents(limit);
  } catch (error) {
    console.error("Google Calendar unavailable; returning local fallback events.", error);
    return localPublicEvents(limit);
  }
}

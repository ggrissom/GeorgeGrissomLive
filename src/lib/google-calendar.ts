type CalendarEventInput = {
  id: string;
  title: string;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  venueName: string;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  googleEventId?: string | null;
};

export type PublicCalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  venueName: string;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  source?: "google" | "local";
};

export type GoogleSyncResult =
  | { status: "skipped"; reason: string }
  | { status: "synced"; googleCalendarId: string; googleEventId: string };

export const PERFORMANCE_CALENDAR_ID =
  process.env.GOOGLE_CALENDAR_ID ||
  "0d93f3b5191f80e930ce0cdb7249a796230adbd8ba2049e7e4e323ffc632cf68@group.calendar.google.com";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

export function isGoogleCalendarConfigured() {
  return Boolean(
    PERFORMANCE_CALENDAR_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

function serviceAccountKey() {
  return (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

async function calendarClient() {
  if (!isGoogleCalendarConfigured()) return null;
  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: serviceAccountKey(),
    scopes: [CALENDAR_SCOPE]
  });
  return google.calendar({ version: "v3", auth });
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function fallbackEndDate(startsAt: Date) {
  return new Date(startsAt.getTime() + 1000 * 60 * 60 * 3);
}

function eventLocation(event: CalendarEventInput) {
  return [event.venueName, event.city, event.state].filter(Boolean).join(", ");
}

function googleBodyForEvent(event: CalendarEventInput) {
  const startsAt = toDate(event.startsAt) || new Date();
  const endsAt = toDate(event.endsAt) || fallbackEndDate(startsAt);
  return {
    summary: event.title || "Live Show",
    location: eventLocation(event),
    description: event.notes || undefined,
    start: {
      dateTime: startsAt.toISOString()
    },
    end: {
      dateTime: endsAt.toISOString()
    },
    extendedProperties: {
      private: {
        georgeAppEventId: event.id
      }
    }
  };
}

export async function syncEventToGoogleCalendar(event: CalendarEventInput): Promise<GoogleSyncResult> {
  const calendar = await calendarClient();
  if (!calendar) {
    return { status: "skipped", reason: "Google Calendar service account env vars are not configured." };
  }

  const requestBody = googleBodyForEvent(event);

  if (event.googleEventId) {
    const response = await calendar.events.update({
      calendarId: PERFORMANCE_CALENDAR_ID,
      eventId: event.googleEventId,
      requestBody
    });
    return {
      status: "synced",
      googleCalendarId: PERFORMANCE_CALENDAR_ID,
      googleEventId: response.data.id || event.googleEventId
    };
  }

  const response = await calendar.events.insert({
    calendarId: PERFORMANCE_CALENDAR_ID,
    requestBody
  });

  if (!response.data.id) throw new Error("Google Calendar did not return an event id.");
  return {
    status: "synced",
    googleCalendarId: PERFORMANCE_CALENDAR_ID,
    googleEventId: response.data.id
  };
}

export async function deleteGoogleCalendarEvent(googleEventId?: string | null) {
  if (!googleEventId) return;
  const calendar = await calendarClient();
  if (!calendar) return;
  await calendar.events.delete({
    calendarId: PERFORMANCE_CALENDAR_ID,
    eventId: googleEventId
  });
}

function parseLocation(location?: string | null) {
  if (!location) return { venueName: "Venue TBA", city: null, state: null };
  const parts = location.split(",").map(part => part.trim()).filter(Boolean);
  return {
    venueName: parts[0] || location,
    city: parts[1] || null,
    state: parts[2] || null
  };
}

export async function listGooglePerformanceEvents(maxResults = 50): Promise<PublicCalendarEvent[]> {
  const calendar = await calendarClient();
  if (!calendar) return [];

  const response = await calendar.events.list({
    calendarId: PERFORMANCE_CALENDAR_ID,
    timeMin: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime"
  });

  return (response.data.items || [])
    .filter(item => item.status !== "cancelled")
    .map(item => {
      const startsAt = item.start?.dateTime || item.start?.date || new Date().toISOString();
      const endsAt = item.end?.dateTime || item.end?.date || null;
      const location = parseLocation(item.location);
      return {
        id: item.id || `google-${startsAt}`,
        title: item.summary || "Live Show",
        startsAt,
        endsAt,
        venueName: location.venueName,
        city: location.city,
        state: location.state,
        notes: item.description || null,
        source: "google"
      };
    });
}

export function googleCalendarErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || "Unknown Google Calendar error");
}

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
const DEFAULT_CALENDAR_TIME_ZONE = "America/Los_Angeles";

export function publicPerformanceCalendarIcalUrl() {
  const configuredUrl = process.env.GOOGLE_CALENDAR_ICAL_URL?.trim();
  if (configuredUrl) return configuredUrl;
  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(PERFORMANCE_CALENDAR_ID)}/public/basic.ics`;
}

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

function stateCode(value?: string | null) {
  if (!value) return null;
  const match = value.trim().match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?\b/);
  return match ? match[1].toUpperCase() : value.trim();
}

function parseLocation(location?: string | null) {
  if (!location) return { venueName: "Venue TBA", city: null, state: null };

  const lines = location
    .split(/\r?\n/)
    .map(part => part.trim())
    .filter(Boolean);

  const venueName = lines[0] || location.trim();
  const addressText = lines.length > 1 ? lines.slice(1).join(", ") : location;
  const parts = addressText
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);

  const stateIndex = parts.findIndex(part => /^[A-Za-z]{2}(?:\s+\d{5}(?:-\d{4})?)?\b/.test(part));
  const city = stateIndex > 0 ? parts[stateIndex - 1] : (lines.length === 1 && parts.length > 1 ? parts[1] : null);
  const state = stateIndex >= 0 ? stateCode(parts[stateIndex]) : (lines.length === 1 && parts.length > 2 ? stateCode(parts[2]) : null);

  return {
    venueName,
    city,
    state
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

type IcalProperty = {
  value: string;
  params: Record<string, string>;
};

function unfoldIcal(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "");
}

function icalProperty(block: string, propertyName: string): IcalProperty | null {
  const wanted = propertyName.toUpperCase();
  for (const line of block.split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const segments = head.split(";");
    if ((segments[0] || "").toUpperCase() !== wanted) continue;

    const params: Record<string, string> = {};
    for (const segment of segments.slice(1)) {
      const equals = segment.indexOf("=");
      if (equals < 0) continue;
      const key = segment.slice(0, equals).toUpperCase();
      const value = segment.slice(equals + 1).replace(/^"|"$/g, "");
      params[key] = value;
    }

    return { value: line.slice(colon + 1), params };
  }
  return null;
}

function unescapeIcalText(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function datePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

function zonedWallTimeToIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
) {
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = desiredAsUtc;

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const observed = datePartsInTimeZone(new Date(guess), timeZone);
      const observedAsUtc = Date.UTC(
        observed.year,
        observed.month - 1,
        observed.day,
        observed.hour,
        observed.minute,
        observed.second
      );
      const correction = desiredAsUtc - observedAsUtc;
      guess += correction;
      if (Math.abs(correction) < 1000) break;
    }
    return new Date(guess).toISOString();
  } catch {
    return new Date(desiredAsUtc).toISOString();
  }
}

function parseIcalDate(property: IcalProperty | null, defaultTimeZone: string) {
  if (!property) return null;
  const match = property.value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);

  if (match[7] === "Z") {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).toISOString();
  }

  const timeZone = property.params.TZID || defaultTimeZone;
  return zonedWallTimeToIso(year, month, day, hour, minute, second, timeZone);
}

function icalCalendarTimeZone(text: string) {
  const match = text.match(/^X-WR-TIMEZONE:(.+)$/m);
  return match?.[1]?.trim() || DEFAULT_CALENDAR_TIME_ZONE;
}

export async function listPublicIcalPerformanceEvents(maxResults = 50): Promise<PublicCalendarEvent[]> {
  const response = await fetch(publicPerformanceCalendarIcalUrl(), {
    cache: "no-store",
    headers: { Accept: "text/calendar,text/plain;q=0.9,*/*;q=0.1" }
  });

  if (!response.ok) {
    throw new Error(`Public Google Calendar iCal request failed with HTTP ${response.status}.`);
  }

  const raw = unfoldIcal(await response.text());
  const defaultTimeZone = icalCalendarTimeZone(raw);
  const cutoff = Date.now() - 1000 * 60 * 60 * 12;
  const events: PublicCalendarEvent[] = [];
  const eventPattern = /BEGIN:VEVENT\n([\s\S]*?)\nEND:VEVENT/g;

  for (const match of raw.matchAll(eventPattern)) {
    const block = match[1];
    if (!block) continue;
    if ((icalProperty(block, "STATUS")?.value || "").toUpperCase() === "CANCELLED") continue;

    const startsAt = parseIcalDate(icalProperty(block, "DTSTART"), defaultTimeZone);
    if (!startsAt || new Date(startsAt).getTime() < cutoff) continue;

    const endsAt = parseIcalDate(icalProperty(block, "DTEND"), defaultTimeZone);
    const summary = unescapeIcalText(icalProperty(block, "SUMMARY")?.value) || "Live Show";
    const locationText = unescapeIcalText(icalProperty(block, "LOCATION")?.value);
    const location = parseLocation(locationText || null);
    const uid = unescapeIcalText(icalProperty(block, "UID")?.value) || `${summary}-${startsAt}`;
    const description = unescapeIcalText(icalProperty(block, "DESCRIPTION")?.value);

    events.push({
      id: `google-ical-${uid}`,
      title: summary,
      startsAt,
      endsAt,
      venueName: location.venueName,
      city: location.city,
      state: location.state,
      notes: description || null,
      source: "google"
    });
  }

  return events
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, maxResults);
}

export function googleCalendarErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || "Unknown Google Calendar error");
}

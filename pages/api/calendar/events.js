/**
 * Calendar proxy + ICS support.
 * - If CALENDAR_PUBLIC_ICS_URL is set in .env, this route fetches and parses the ICS feed and returns a JSON list.
 * - For private calendars, implement a server-side Google Calendar API fetch (not included here).
 */
import fetch from 'node-fetch';
import ical from 'node-ical';

export default async function handler(req, res) {
  const url = process.env.CALENDAR_PUBLIC_ICS_URL;
  if (!url) return res.status(400).json({ error: 'No calendar configured (CALENDAR_PUBLIC_ICS_URL)' });

  try {
    const r = await fetch(url);
    const text = await r.text();
    const data = ical.parseICS(text);
    const events = Object.values(data)
      .filter(item => item.type === 'VEVENT')
      .map(ev => ({
        uid: ev.uid,
        summary: ev.summary,
        location: ev.location,
        start: ev.start,
        end: ev.end,
        description: ev.description
      }))
      .sort((a,b) => new Date(a.start) - new Date(b.start));
    res.json(events);
  } catch (err) {
    console.error('Calendar fetch/parse error', err);
    res.status(500).json({ error: 'Unable to fetch calendar' });
  }
}

# GeorgeGrissomLive Web App MVP

A runnable full-stack MVP for George Grissom's music site, audience request/tip flow, private performer song catalog, Google-backed performance calendar, fan media uploads, jukebox, and admin dashboard.

This package is intentionally local-first so it can run on a contractor laptop immediately:

- Next.js app router website and API routes
- Prisma ORM
- SQLite local database for MVP/dev
- Google Performance Calendar-backed public calendar with local fallback
- Admin calendar entry that syncs to Google Calendar when service-account env vars are configured
- CSV / Excel / PDF / text song catalog imports
- Optional OpenAI-assisted song row normalization
- Optional MusicBrainz search for song metadata
- Optional Stripe Checkout for tips, requests, catalog unlocks, and jukebox credits
- Browser one-button recording with selectable mic / mixer / audio interface input
- Admin-only private setlists with duplication, event/venue linking, searchable checkbox song assignment, and song-form setlist association
- More realistic CSS jukebox angled inward 30 degrees with a lightweight scroll-wheel song selector
- Local uploaded media storage under `public/uploads`

## What is included

```txt
src/app/                 Next.js pages, admin dashboard, API routes
src/lib/                 auth, database, file, import, AI, metadata utilities
prisma/schema.prisma     database schema, including Event, Song, Setlist, and SetlistSong
prisma/seed.ts           starter events/songs
docs/INSTALL.md          full install/run instructions
docs/SPEC.md             architecture/design spec
legacy/                  copied files from the uploaded earlier static concept ZIP
```

## Private lyrics and learning notes

The app is designed so lyrics, chords, and rehearsal notes are private admin-only fields by default:

- `privateLyricsNotes`
- `privateChordNotes`
- `privateRehearsalNotes`

The public site only shows song metadata unless an admin deliberately extends the public UI later.

## First run

See [`docs/INSTALL.md`](docs/INSTALL.md).

Quick version:

```bash
cp .env.example .env
npm run setup
npm run dev
```

Open:

- Public site: `http://localhost:3000`
- Admin dashboard: `http://localhost:3000/admin`

Default login comes from `.env`:

```txt
ADMIN_EMAIL=admin@georgegrissom.com
ADMIN_PASSWORD=change-this-password
```

Change it before using the app with real data.


## Google Performance Calendar

The public calendar keeps this site's custom styling and pulls event data from the configured Google Performance Calendar when service-account credentials are present. Admin-created shows save locally first, then sync to Google Calendar. If Google is unavailable or not configured, the public page falls back to local public events.

Add these to `.env`:

```env
GOOGLE_CALENDAR_ID="0d93f3b5191f80e930ce0cdb7249a796230adbd8ba2049e7e4e323ffc632cf68@group.calendar.google.com"
GOOGLE_SERVICE_ACCOUNT_EMAIL=""
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=""
```

Share the Google calendar with the service account email and grant permission to make changes.

## Private setlists

The admin dashboard includes a **Setlists** tab. Setlists are private for the MVP and can be created from scratch, duplicated from older setlists, linked to a show, assigned to a venue, and filled by searching songs and checking boxes. Songs can also be associated to setlists from the song editor by typing setlist names.

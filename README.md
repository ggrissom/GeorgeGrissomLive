# GeorgeGrissomLive Web App MVP

A runnable full-stack MVP for George Grissom's music site, audience request/tip flow, private performer song catalog, manual calendar, fan media uploads, jukebox, and admin dashboard.

This package is intentionally local-first so it can run on a contractor laptop immediately:

- Next.js app router website and API routes
- Prisma ORM
- SQLite local database for MVP/dev
- Manual calendar entry in admin
- CSV / Excel / PDF / text song catalog imports
- Optional OpenAI-assisted song row normalization
- Optional MusicBrainz search for song metadata
- Optional Stripe Checkout for tips, requests, catalog unlocks, and jukebox credits
- Browser one-button recording with selectable mic / mixer / audio interface input
- Local uploaded media storage under `public/uploads`

## What is included

```txt
src/app/                 Next.js pages, admin dashboard, API routes
src/lib/                 auth, database, file, import, AI, metadata utilities
prisma/schema.prisma     database schema
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

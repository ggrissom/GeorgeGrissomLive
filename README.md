# GeorgeGrissomLive Web App MVP

A full-stack Next.js application for George Grissom's public music site, audience requests and tips, calendar, fan uploads, standalone jukebox, and private admin dashboard.

## What is included

- Next.js App Router website and API routes
- Prisma ORM with PostgreSQL
- Google Performance Calendar integration with local database fallback
- CSV, Excel, PDF, and text song-catalog imports
- Optional OpenAI-assisted row normalization and MusicBrainz metadata search
- Optional Stripe Checkout for tips and requests
- Browser recording with selectable mic or audio-interface input
- Private setlists, song notes, requests, uploads, and booking administration
- Reusable working jukebox on the homepage and at `/jukebox`
- Generated catalog with five songs per page, two pages per desktop spread, and no placeholder cards
- Persistent jukebox audio in Vercel Blob using browser-direct multipart uploads

```txt
src/app/                 Next.js pages, admin dashboard, and API routes
src/components/jukebox/  Reusable player, machine, catalog, and title cards
src/lib/                 Auth, database, catalog, import, and metadata utilities
prisma/schema.prisma     PostgreSQL schema
prisma/migrations/       Production database migrations
prisma/seed.ts           Starter events and songs
docs/INSTALL.md          Install, administration, migration, and deployment guide
docs/SPEC.md             Original application architecture/design spec
```

## First run

See [`docs/INSTALL.md`](docs/INSTALL.md) for the full instructions.

```bash
cp .env.example .env
npm run setup
npm run dev
```

Open the public site at `http://localhost:3000`, the standalone player at `http://localhost:3000/jukebox`, and the admin dashboard at `http://localhost:3000/admin`.

## Jukebox administration

Sign in to `/admin` and open **Songs**.

1. Add a song with title, artist, optional album, jukebox order, public visibility, and optionally an MP3 or WAV file. A blank album displays as `SINGLE`.
2. Use the row editor to change title, artist, album, order, or public visibility, then select **Save edits**. Lower order values appear first; equal values fall back to title order.
3. Select a local audio file to preview it and its browser-read duration before uploading. **Upload audio** or **Replace audio** sends the bytes directly from the browser to public Vercel Blob storage; the application server issues the short-lived upload authorization and then verifies the stored Blob and duration before updating the song.
4. Duration is calculated again on the server and stored as whole seconds. To correct a bad duration, replace the file with a valid MP3 or WAV so it is recalculated. There is no manual duration override in the current admin UI.
5. Use the row's audio controls to preview the stored track. Clear **Public** to remove the song from the public jukebox without deleting it.
6. Choose **Delete; keep audio** to remove only the database record. Choose **Delete + owned audio** to remove the record and request deletion of the exact app-owned Blob.

Replacement and deletion never remove arbitrary external or legacy URLs. The app deletes only when both the stored Blob URL and pathname prove ownership in the configured store. A failed immediate deletion is queued in `AudioCleanup` and retried with leases and backoff. If durable retry cannot be recorded or retries become terminal, the admin message gives the exact Blob URL and pathname for manual cleanup.

Vercel function filesystem writes are ephemeral. Do not write runtime jukebox uploads into `public/`, `.next/`, or another local deployment directory. Jukebox audio persists only when `BLOB_READ_WRITE_TOKEN` connects the deployment to the intended Vercel Blob store.

## Required production environment variable names

Set these in Vercel for every environment that must run the full application. Values are intentionally not documented here.

- `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `BLOB_READ_WRITE_TOKEN`

Optional integrations use these variable names:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `MUSICBRAINZ_CONTACT_EMAIL`

Never commit environment values, Blob credentials, database credentials, or admin credentials.

## Private lyrics and learning notes

Lyrics, chords, and rehearsal notes are private admin-only fields:

- `privateLyricsNotes`
- `privateChordNotes`
- `privateRehearsalNotes`

The public jukebox response is allow-list based and does not expose those fields, storage credentials, or other admin-only metadata.

## Google Performance Calendar

The public calendar reads Google events when `GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` are configured. Admin-created shows save locally first and then sync. If Google is unavailable or not configured, the public page falls back to local public events.

Share the performance calendar with the configured service-account email and grant permission to make changes.

## Private setlists

The **Setlists** tab can create or duplicate private setlists, link them to a show and venue, search and assign songs, and reorder the result. Songs may also be associated with setlists from the song editor.

## Release note

Apply the committed Prisma migrations and complete the regression gates before merging a reviewed feature branch into `main`. A push to a non-production branch creates a Vercel preview; `main` is the production branch. Do not promote a preview or rewrite DNS until the whole branch has final approval. See [`docs/INSTALL.md`](docs/INSTALL.md) for the exact release sequence and current build-script caveat.

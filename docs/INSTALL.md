# Install, Administer, and Deploy

## 1. Prerequisites

- Node.js 20 or newer
- npm
- Git
- PostgreSQL for local and deployed data
- A modern browser
- A Vercel project and Vercel Blob store for production jukebox audio
- Optional Stripe, OpenAI, Google Calendar, and MusicBrainz configuration

The Prisma datasource is PostgreSQL. The older SQLite instructions do not apply to the current schema.

## 2. Install locally

```bash
git clone <repository-url>
cd GeorgeGrissomLive
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open:

- `http://localhost:3000`
- `http://localhost:3000/jukebox`
- `http://localhost:3000/admin`

Use a disposable development database for local work. `npm run setup` uses `prisma db push`; prefer the explicit migration sequence above when reproducing the production schema.

## 3. Environment variable names

Copy values through the deployment platform or a local uncommitted `.env`. Only variable names are documented here.

Required for the deployed application:

| Variable name | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection used by Prisma |
| `ADMIN_EMAIL` | Admin login identity |
| `ADMIN_PASSWORD` | Admin login password |
| `ADMIN_SESSION_SECRET` | HMAC secret for admin session cookies |
| `NEXT_PUBLIC_SITE_URL` | Canonical site origin used in redirects and checkout |
| `BLOB_READ_WRITE_TOKEN` | Server-only credential for the persistent jukebox Blob store |

Optional integrations:

| Variable name | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe server API credential |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe browser configuration where used |
| `OPENAI_API_KEY` | Optional import normalization |
| `GOOGLE_CALENDAR_ID` | Performance calendar |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Calendar service account |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Calendar service-account key |
| `MUSICBRAINZ_CONTACT_EMAIL` | MusicBrainz request identification |

Set required variables separately for Preview and Production in Vercel. Never commit their values. Preview deployments should use a preview database unless schema changes against the production database are deliberate and approved.

## 4. Database migrations

The standalone jukebox depends on these committed migrations, in order:

1. `20260801213000_jukebox_song_metadata` adds album, duration, stable jukebox order, and the public-ordering index.
2. `20260801233000_jukebox_audio_cleanup` adds the persisted Blob pathname and durable `AudioCleanup` table.
3. `20260801234500_audio_cleanup_leases` adds cleanup scheduling, leases, terminal state, and its index.

Before deploying code that reads these fields:

```bash
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
```

Run these with `DATABASE_URL` supplied securely for the intended database. Back up production first and verify `npx prisma migrate status` afterward. `prisma migrate deploy` applies committed migrations without generating new ones.

The current `npm run build` script also runs `prisma db push --accept-data-loss`. That means a Vercel build can mutate whichever database its deployment environment references. Apply and verify migrations before deployment, keep preview and production database scope intentional, and treat this build-script behavior as a release concern until it is separated into an explicit migration phase.

## 5. Admin jukebox workflow

Sign in at `/admin`, then open **Songs**.

### Add a song

1. Enter the title and optional artist and album.
2. Leave album blank to display `SINGLE`.
3. Set a non-negative **Jukebox order**. Lower values appear first; equal values are ordered by title.
4. Select **Visible in public jukebox** only when the song should appear publicly.
5. Optionally select an MP3 or WAV file.
6. Select **Add song**. The record is created first; if audio upload fails, the song remains and can be repaired from its row.

### Edit metadata, visibility, and order

Edit title, artist, album, order, or **Public** in the song row and select **Save edits**. Clearing **Public** removes the song from `/jukebox` without deleting its metadata or audio.

### Preview, upload, replace, and correct duration

- Selecting a local file creates a browser-only preview and displays the browser-read duration.
- **Upload audio** and **Replace audio** accept MP3 or WAV files up to 200 MB.
- Upload bytes go directly from the browser to public Vercel Blob using multipart upload. The application server authenticates the admin, validates the song-scoped path, and issues the short-lived upload token; `BLOB_READ_WRITE_TOKEN` remains server-only.
- After upload, the server verifies the exact Blob URL and pathname, streams metadata from Blob, rounds duration to whole seconds, and only then attaches the Blob to the song.
- Use the row's audio control to preview the stored file.
- To correct an inaccurate or unreadable duration, replace the audio with a valid source so the server recalculates it. The current admin UI does not expose a manual duration override.

### Reorder

Edit **Jukebox order** and save. Gaps are fine; values such as 10, 20, and 30 make later insertion easier. Ordering does not change until **Save edits** succeeds.

### Delete

The two actions intentionally have different storage effects:

- **Delete; keep audio** deletes the song record and does not attempt Blob deletion.
- **Delete + owned audio** deletes the song record and then requests deletion only when the database contains the exact app-owned Blob URL and pathname. External URLs and legacy audio without persisted ownership metadata are left untouched.

The record deletion happens before Blob cleanup. Immediate Blob deletion uses ownership verification and an object version precondition. If it fails, the app writes an `AudioCleanup` task and later requests retry up to five due tasks when the song-delete or audio endpoint runs. Each task uses a five-minute lease, exponential backoff capped at one day, and becomes terminal after eight attempts.

When deletion cannot be queued or a file cannot be proven owned, the admin message includes the exact Blob URL and pathname for manual cleanup. Delete only that named object from the configured store, then retry the intended admin action. Do not remove similarly named or untracked objects.

## 6. Persistent Vercel Blob behavior

Vercel Functions do not provide persistent writable filesystem storage. Files written at runtime under `public/`, `.next/`, `/tmp`, or another deployment path do not become durable public assets. `/tmp` is temporary function scratch space only.

For the jukebox:

- Connect the intended Vercel Blob store to the project.
- Confirm `BLOB_READ_WRITE_TOKEN` exists in every Vercel environment where admins may upload or replace audio.
- Redeploy after changing environment configuration.
- Keep Blob access public because the player uses public audio URLs.
- Do not put Blob credentials in client code or a `NEXT_PUBLIC_` variable.
- Preserve both `Song.audioUrl` and `Song.audioStoragePath`; cleanup requires the exact pair.

If `BLOB_READ_WRITE_TOKEN` is absent, token generation/finalization returns **Audio storage is not configured** and admin upload/replace is blocked. Existing local or external audio URLs may still play, but new persistent uploads are not release-ready.

## 7. Regression gates

Run from a clean checkout of the reviewed commit:

```bash
npm install
npm test
npx tsc --noEmit
npx prisma validate
```

For an isolated production Next.js compile that must not mutate a database, run Prisma client generation and `next build` directly with a non-production build-time `DATABASE_URL`:

```bash
npx prisma generate
npx next build
```

The build output must include `/`, `/jukebox`, `/admin`, `/api/songs`, and `/api/admin/songs/audio`. Inspect public API responses and generated client chunks to confirm private lyric, chord, rehearsal, storage-path, and credential fields are absent.

Use `npm run build` only when its configured `prisma db push --accept-data-loss` step is intended for the referenced database. A Vercel preview build currently executes that script.

## 8. Vercel preview and production deployment

1. Confirm the Vercel project is linked to `ggrissom/GeorgeGrissomLive`.
2. Confirm the production branch is `main`.
3. Confirm all required environment variable names are present in Preview and Production; do not print their values into logs or handoff notes.
4. Apply and verify the migrations against the intended database.
5. Push the reviewed feature branch normally. Git integration should create a Preview deployment.
6. Confirm the Preview deployment metadata names the exact reviewed commit and reaches `READY`.
7. Verify the unique HTTPS preview URL and its branch alias at `/jukebox`.
8. Complete whole-branch review. Do not merge, promote, or change DNS while review is pending.
9. After approval, merge normally to `main` and let the Git-linked production deployment build the reviewed commit.
10. Confirm the production deployment commit, then verify `https://live.georgegrissom.com/jukebox`.

Do not rewrite DNS unless the existing domain mapping is proven wrong. A domain alias may still point to the last production deployment while a feature preview is healthy; that is expected.

## 9. Release verification

At the feature preview and, only after approval, production:

- HTTPS returns success for `/jukebox`.
- The classic chrome artwork loads.
- The catalog contains only real public songs and a final partial page has no blank cards.
- Each intended audio URL loads and plays.
- Play, pause, seek, previous, next, automatic advance, catalog open/close, keyboard navigation, and mobile touch navigation work.
- The homepage uses the shared player.
- `/admin`, setlists, calendar, requests, uploads, and booking still load.
- Admin upload and replacement succeed against persistent Blob storage.
- Both delete choices produce their documented storage behavior.
- No private notes, storage paths, or credentials appear in the public jukebox API or client bundles.

Record the verified commit SHA, preview URL, production URL, deployment state, migration state, and environment-variable presence in the release handoff. Record names and readiness only, never values.

## 10. Other admin workflows

- **Setlists:** create or duplicate private setlists, link a show and venue, search songs, assign them, and reorder.
- **Calendar:** configure the three Google Calendar variables, share the calendar with the service-account email, and grant event-change access.
- **Imports:** CSV, Excel, text PDF, and text files stage rows for review; scanned sources require manual/OCR handling.
- **Recording:** browser recording requires microphone permission and saves through the existing recording flow. This flow is separate from jukebox Blob audio.
- **Stripe:** without Stripe variables the checkout route records demo/manual payments.

## 11. Troubleshooting

### Admin login fails

Confirm `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` exist in the current environment, then restart or redeploy.

### Database or build fails

Confirm `DATABASE_URL`, run `npx prisma validate`, then `npx prisma migrate status`. Do not use `db push --accept-data-loss` against production as an ad-hoc repair.

### Upload reports that storage is not configured

Confirm `BLOB_READ_WRITE_TOKEN` is present in the same Vercel environment as the failing deployment and that the project is connected to the correct Blob store. Redeploy after correcting configuration.

### Cleanup required

Follow the admin message's exact URL and pathname. Check `AudioCleanup` for queued or terminal work. Delete only the exact tracked object; external and legacy URLs are intentionally protected from automatic deletion.

### Preview is protected

Use an authorized Vercel session or a temporary Vercel share link. Treat a protected-browser result separately from deployment health: deployment metadata may be `READY` while an unauthenticated browser receives an access challenge.

### Jukebox shows an unavailable track

Confirm the song is public, its `audioUrl` is reachable over HTTPS, and persistent upload finalization succeeded. Re-upload a valid MP3 or WAV when duration or metadata cannot be read.

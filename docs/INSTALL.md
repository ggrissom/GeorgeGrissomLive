# Install and Run Instructions

## 1. Prerequisites

Install these on the machine that will run the MVP:

- Node.js 20 or newer
- npm
- Git, optional but recommended
- A modern browser for recording support
- Optional Stripe account for real payments
- Optional OpenAI API key for AI catalog normalization
- Optional deployment host such as Vercel, Render, Fly.io, Railway, or a VPS

## 2. Unzip and enter the project

```bash
unzip 20260623_*_georgegrissomDotCom-webapp.zip
cd georgegrissomDotCom-webapp
```

## 3. Create environment file

```bash
cp .env.example .env
```

Edit `.env`.

Minimum local settings:

```env
DATABASE_URL="file:./dev.db"
ADMIN_EMAIL="admin@georgegrissom.com"
ADMIN_PASSWORD="change-this-password"
ADMIN_SESSION_SECRET="replace-with-a-long-random-string"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

Use a strong `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`.

## 4. Install dependencies and initialize database

```bash
npm run setup
```

This performs:

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

## 5. Start local dev server

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
http://localhost:3000/admin
```

## 6. Admin dashboard features

The admin dashboard includes:

- Live request queue
- Google-synced event/calendar entry
- Song catalog create/delete and type-to-add setlist association
- Private lyric/chord/rehearsal notes
- Private setlist builder with duplication, venue/show linking, search, checkboxes, and ordering
- CSV/Excel/PDF/text import staging
- MusicBrainz metadata search
- External lyric/chord/key/BPM search links for private learning
- One-button browser recording
- Fan upload moderation
- Booking inquiry management

## 7. Song catalog import

Supported MVP inputs:

- `.csv`
- `.xlsx`
- `.xls`
- text-based `.pdf`
- text files
- images / scanned PDFs saved for manual/OCR review

Notes:

- CSV and Excel files are parsed into rows.
- Text PDFs are parsed using embedded text.
- Scanned PDFs/images are saved and flagged for manual/OCR review in this MVP unless you add a full OCR pipeline.
- If `OPENAI_API_KEY` is set, each parsed row is sent through AI normalization to map messy fields into app-compatible song records.
- Every import is staged for admin review before it becomes a real song.

## 8. Optional OpenAI setup

Add:

```env
OPENAI_API_KEY="sk-..."
```

Then restart the dev server.

OpenAI is used for:

- Mapping messy spreadsheet/PDF rows into song fields
- Confidence scores
- Warnings
- Inference of mood/genre/tempo label when possible

The app does not automatically publish lyrics or chords.

## 9. Optional Stripe setup

Add:

```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

For local webhook testing, install Stripe CLI and run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook secret into `.env`, then restart the app.

Without Stripe keys, payments run in `demo_no_stripe` mode so contractors can test the full flow without charging cards.


## 10. Google Performance Calendar setup

The app is preconfigured to use this Performance Calendar ID:

```env
GOOGLE_CALENDAR_ID="0d93f3b5191f80e930ce0cdb7249a796230adbd8ba2049e7e4e323ffc632cf68@group.calendar.google.com"
```

To enable admin write-sync and public Google calendar reads:

1. Create a Google Cloud service account.
2. Enable the Google Calendar API on that Google Cloud project.
3. Create a JSON key for the service account.
4. Copy the service account email into `.env`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL="service-account-name@project-id.iam.gserviceaccount.com"
```

5. Copy the private key into `.env`. Keep the escaped newlines:

```env
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

6. Open the Google Performance Calendar sharing settings.
7. Share the calendar with the service account email.
8. Grant permission to make changes to events.
9. Restart the app.

Behavior:

- Public `/` and `/api/events` read upcoming events from Google Calendar when credentials are present.
- Admin-created events save locally first, then create/update Google Calendar events.
- The local `Event.googleEventId` prevents duplicate Google events on future edits.
- If Google fails, the event remains local and shows `google_error` in admin.
- If Google is not configured, the app uses the local SQLite event list.

## 11. Private setlists

Open `/admin`, then the **Setlists** tab.

Available MVP workflows:

- Create a private setlist with name, venue, optional show association, and notes.
- Duplicate an older setlist and optionally point it to a different venue/show.
- Search the song catalog from inside the setlist builder.
- Check a song to add it to the setlist.
- Uncheck or remove a song to detach it.
- Use Up/Down to change song order.
- From the **Songs** tab, type a setlist name into the song form or per-song quick-add field to associate songs quickly.

Setlists are private/admin-only in this MVP.

## 12. Jukebox visual behavior

The public jukebox is CSS-rendered for performance. It uses:

- a more realistic chrome/glass/LED treatment
- a `rotateY(-30deg)` inward angle
- a lightweight scroll-wheel song selector that renders only visible rows
- search on the main jukebox section
- the existing free-play/catalog-unlock logic


## 13. One-button recording

The recording tab uses the browser's audio device APIs.

For built-in mic:

1. Open `/admin`
2. Go to **Record**
3. Grant microphone permission
4. Press **Record**
5. Press **Stop**
6. Press **Save recording**

For mixer/audio-interface input:

1. Connect the mixer/interface before opening the page
2. Grant mic permission
3. Pick the device from the dropdown
4. Record and save

Saved recordings go to:

```txt
public/uploads/recordings
```

Database records go to the `Recording` table.

## 14. Production deployment notes

For production, contractors should replace the local-only pieces:

| MVP piece | Production recommendation |
|---|---|
| SQLite | Postgres, Supabase, Neon, Railway, Render, or RDS |
| local `/public/uploads` | S3, Cloudflare R2, Supabase Storage, or similar |
| simple env-password admin auth | Supabase Auth, Auth.js, Clerk, or another real auth provider |
| polling live queue | Supabase Realtime, Pusher, Ably, or WebSockets |
| local media files | object storage + signed URLs |
| manual OCR fallback | managed OCR or OpenAI file/vision pipeline |

## 15. Useful commands

```bash
npm run dev       # local development
npm run build     # production build
npm run start     # start production build
npm run db:push   # apply Prisma schema to SQLite
npm run db:seed   # seed starter data
```

## 16. Troubleshooting

### Admin login fails

Check `.env`:

```env
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

Restart the dev server after changing `.env`.

### Import fails

Make sure dependencies installed:

```bash
npm install
npx prisma generate
```

For scanned PDFs, use manual review or add OCR. Text PDFs should parse.

### Recording device does not show

Browsers often hide device labels until microphone permission is granted. Open the Record tab, allow permission, then refresh.

### Stripe checkout does not open

Check `STRIPE_SECRET_KEY` and restart. In local test mode, use Stripe CLI for webhooks.

### Database looks empty

Run:

```bash
npx prisma db push
npm run db:seed
```

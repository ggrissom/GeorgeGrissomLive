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
- Manual event/calendar entry
- Song catalog create/delete
- Private lyric/chord/rehearsal notes
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

## 10. One-button recording

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

## 11. Production deployment notes

For production, contractors should replace the local-only pieces:

| MVP piece | Production recommendation |
|---|---|
| SQLite | Postgres, Supabase, Neon, Railway, Render, or RDS |
| local `/public/uploads` | S3, Cloudflare R2, Supabase Storage, or similar |
| simple env-password admin auth | Supabase Auth, Auth.js, Clerk, or another real auth provider |
| polling live queue | Supabase Realtime, Pusher, Ably, or WebSockets |
| local media files | object storage + signed URLs |
| manual OCR fallback | managed OCR or OpenAI file/vision pipeline |

## 12. Useful commands

```bash
npm run dev       # local development
npm run build     # production build
npm run start     # start production build
npm run db:push   # apply Prisma schema to SQLite
npm run db:seed   # seed starter data
```

## 13. Troubleshooting

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

# Standalone Jukebox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, fully working image-based jukebox at `/jukebox` with a generated two-page catalog, real audio playback, and complete song/audio administration.

**Architecture:** Extend the existing Prisma `Song` record with album, duration, and stable ordering; expose a safe public query; and isolate playback state in a reusable client component. The homepage and standalone route share that component, while focused catalog utilities make page-count and fallback behavior deterministic and testable.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript 5.6, Prisma 5/PostgreSQL, native HTMLAudioElement, Node test runner with tsx, Vercel.

## Global Constraints

- Preserve the supplied straight-on chrome jukebox artwork as the dominant visual.
- Dedicated route: `/jukebox`.
- Reuse the same player on the homepage.
- Five songs per page and ten songs per desktop spread.
- Never render blank catalog pages or placeholder song cards.
- Missing album displays exactly `SINGLE`.
- Touch targets are at least 44 by 44 CSS pixels.
- Support current iPhone/iPad Safari and modern desktop browsers.
- Respect `prefers-reduced-motion`.
- Never expose private lyrics, chords, rehearsal notes, storage credentials, or admin-only fields through the public jukebox.
- Paid credits, request/tipping changes, lyrics/karaoke, licensing automation, and native apps remain out of scope.
- Preserve the existing setlist, calendar, request, booking, and upload flows.

---

## File Map

**Create**

- `src/lib/jukebox.ts` — public song projection, ordering, display fallbacks, duration formatting, and page/spread calculations.
- `src/lib/jukebox.test.ts` — deterministic unit tests for catalog and display rules.
- `src/components/jukebox/jukebox-player.tsx` — persistent player state and audio event handling.
- `src/components/jukebox/jukebox-machine.tsx` — artwork, Now Playing panel, and machine controls.
- `src/components/jukebox/jukebox-catalog.tsx` — catalog drawer, page navigation, focus, swipe, and keyboard behavior.
- `src/components/jukebox/song-card.tsx` — accessible title card.
- `src/app/jukebox/page.tsx` — dedicated server-rendered jukebox route.
- `src/app/api/admin/songs/audio/route.ts` — authenticated audio upload/replacement and duration extraction.
- `src/app/api/admin/songs/audio/metadata.ts` — bounded audio metadata reader.
- `src/app/api/admin/songs/audio/metadata.test.ts` — metadata validation tests.
- `prisma/migrations/<timestamp>_jukebox_song_metadata/migration.sql` — production schema migration.
- `public/images/jukebox-basis-2026-08-01.jpeg` — approved supplied artwork.

**Modify**

- `prisma/schema.prisma` — add `album`, `durationSeconds`, and `jukeboxOrder`.
- `package.json` — add deterministic test command and metadata dependency if required.
- `src/app/api/songs/route.ts` — safe ordered public read and validated admin mutations.
- `src/app/page.tsx` — query the shared jukebox projection.
- `src/app/site-shell.tsx` — replace duplicated wheel/player state with the reusable player.
- `src/components/reference-jukebox.tsx` — retire the wheel implementation in favor of compatibility export or remove after all consumers migrate.
- `src/app/admin/admin-app.tsx` — edit/upload/preview/order/delete controls.
- `src/app/globals.css` — responsive machine and catalog presentation.
- `prisma/seed.ts` — populate deterministic jukebox order and album fallback cases.
- `README.md` and `docs/INSTALL.md` — admin and deployment instructions.

---

### Task 1: Catalog Domain Utilities and Test Runner

**Files:**

- Create: `src/lib/jukebox.ts`
- Create: `src/lib/jukebox.test.ts`
- Modify: `package.json`

**Interfaces:**

- Produces: `PublicJukeboxSong`, `toPublicJukeboxSong(song)`, `paginateSongs(songs, pageSize)`, `createSpreads(pages)`, and `formatDuration(seconds)`.
- Consumes: plain song-shaped objects from Prisma or tests.

- [ ] **Step 1: Add the focused test command**

Add to `package.json` scripts:

```json
"test": "node --import tsx --test \"src/**/*.test.ts\""
```

- [ ] **Step 2: Write failing catalog tests**

Create `src/lib/jukebox.test.ts` with table-driven assertions for song counts `0, 1, 5, 6, 10, 11, 20, 21`. Assert that every flattened ID exactly matches the input IDs once, no page exceeds five songs, no empty page exists, and spreads contain at most two nonempty pages.

Also assert:

```ts
assert.equal(toPublicJukeboxSong({ id: "1", title: "One", album: null }).albumLabel, "SINGLE");
assert.equal(formatDuration(0), "0:00");
assert.equal(formatDuration(65), "1:05");
assert.equal(formatDuration(null), "—");
```

- [ ] **Step 3: Run the tests and verify failure**

Run: `npm test -- src/lib/jukebox.test.ts`  
Expected: FAIL because `src/lib/jukebox.ts` does not exist.

- [ ] **Step 4: Implement the minimal domain module**

Define:

```ts
export type PublicJukeboxSong = {
  id: string;
  title: string;
  artist: string;
  albumLabel: string;
  audioUrl: string | null;
  durationSeconds: number | null;
  jukeboxOrder: number;
  playable: boolean;
};

export function paginateSongs<T>(songs: T[], pageSize = 5): T[][] {
  if (pageSize < 1) throw new RangeError("pageSize must be positive");
  const pages: T[][] = [];
  for (let index = 0; index < songs.length; index += pageSize) {
    pages.push(songs.slice(index, index + pageSize));
  }
  return pages;
}

export function createSpreads<T>(pages: T[][]): Array<{ left: T[]; right?: T[] }> {
  const spreads: Array<{ left: T[]; right?: T[] }> = [];
  for (let index = 0; index < pages.length; index += 2) {
    spreads.push({ left: pages[index], right: pages[index + 1] });
  }
  return spreads;
}
```

Implement `toPublicJukeboxSong` so it includes only the public fields above, trims labels, uses `Unknown Artist` unless the stored artist is present, maps missing album to `SINGLE`, and sets `playable` from a nonempty `audioUrl`.

- [ ] **Step 5: Run tests**

Run: `npm test -- src/lib/jukebox.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json src/lib/jukebox.ts src/lib/jukebox.test.ts
git commit -m "test: define jukebox catalog behavior"
```

### Task 2: Song Schema and Production Migration

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_jukebox_song_metadata/migration.sql`
- Modify: `prisma/seed.ts`

**Interfaces:**

- Produces: nullable `Song.album String?`, nullable `Song.durationSeconds Int?`, and `Song.jukeboxOrder Int @default(0)`.
- Consumes: existing `Song` records without requiring destructive backfill.

- [ ] **Step 1: Add schema fields and ordering index**

Add to `Song`:

```prisma
album           String?
durationSeconds Int?
jukeboxOrder    Int     @default(0)

@@index([isPublic, jukeboxOrder, title])
```

- [ ] **Step 2: Write the non-destructive SQL migration**

Use:

```sql
ALTER TABLE "Song" ADD COLUMN "album" TEXT;
ALTER TABLE "Song" ADD COLUMN "durationSeconds" INTEGER;
ALTER TABLE "Song" ADD COLUMN "jukeboxOrder" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Song_isPublic_jukeboxOrder_title_idx"
ON "Song"("isPublic", "jukeboxOrder", "title");
```

- [ ] **Step 3: Update seed ordering**

Set seed songs to orders `10, 20, 30, 40`. Give one seed song an album and leave another null to preserve the `SINGLE` path.

- [ ] **Step 4: Generate and validate Prisma**

Run: `npx prisma format && npx prisma generate`  
Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/seed.ts
git commit -m "feat: add jukebox song metadata"
```

### Task 3: Safe Ordered Song API

**Files:**

- Modify: `src/app/api/songs/route.ts`
- Modify: `src/app/page.tsx`
- Create: `src/app/jukebox/page.tsx`
- Test: `src/lib/jukebox.test.ts`

**Interfaces:**

- Consumes: `toPublicJukeboxSong` from Task 1 and Prisma fields from Task 2.
- Produces: ordered `PublicJukeboxSong[]` for server pages and `GET /api/songs?jukebox=1`.

- [ ] **Step 1: Add a projection safety test**

Create an input object containing `privateLyricsNotes`, `privateChordNotes`, `privateRehearsalNotes`, and `rightsStatus`. Assert that none of those keys exist on `toPublicJukeboxSong(input)`.

- [ ] **Step 2: Run and verify the focused test**

Run: `npm test -- src/lib/jukebox.test.ts`  
Expected: PASS only if the projection is allow-list based; fix any spread-based projection.

- [ ] **Step 3: Add the ordered public query**

For jukebox reads, use:

```ts
where: { isPublic: true },
orderBy: [{ jukeboxOrder: "asc" }, { title: "asc" }]
```

Map every record through `toPublicJukeboxSong`. Do not return the Prisma object directly.

- [ ] **Step 4: Add the dedicated server page**

`src/app/jukebox/page.tsx` queries the ordered public songs and renders:

```tsx
<JukeboxPlayer initialSongs={songs.map(toPublicJukeboxSong)} standalone />
```

Until Task 5 creates the player, add no mock behavior; keep the route change in the same uncommitted task sequence and finish through Task 5 before a route-level commit if TypeScript would otherwise break.

- [ ] **Step 5: Update homepage query**

Replace `publicShortlist: true` as the jukebox data source with `isPublic: true`, ordered by `jukeboxOrder` then title. Request forms may derive their subset separately.

- [ ] **Step 6: Run checks**

Run: `npm test && npx tsc --noEmit`  
Expected: tests pass; TypeScript may remain pending only until the Task 5 component is added in the same working branch.

- [ ] **Step 7: Commit after Task 5 compiles**

```bash
git add src/app/api/songs/route.ts src/app/page.tsx src/app/jukebox/page.tsx
git commit -m "feat: expose ordered public jukebox catalog"
```

### Task 4: Song Card and Generated Catalog

**Files:**

- Create: `src/components/jukebox/song-card.tsx`
- Create: `src/components/jukebox/jukebox-catalog.tsx`
- Create: `src/components/jukebox/jukebox-catalog.test.ts`

**Interfaces:**

- Consumes: `PublicJukeboxSong`, `paginateSongs`, `createSpreads`, and `formatDuration`.
- Produces: `JukeboxCatalog({ songs, selectedSongId, open, onClose, onSelect })`.

- [ ] **Step 1: Write failing spread-label tests**

Test songs with missing album and durations, six songs, and eleven songs. Assert visible strings include `SINGLE`, formatted duration, and exactly the actual song titles—never an empty title-card element.

- [ ] **Step 2: Run test and verify failure**

Run: `npm test -- src/components/jukebox/jukebox-catalog.test.ts`  
Expected: FAIL because the catalog module does not exist.

- [ ] **Step 3: Implement `SongCard`**

Use a semantic `button` with `aria-current={selected ? "true" : undefined}`. Render artist, title, album label, and duration. Disable only when product rules require the unavailable song to be unselectable; otherwise selection may still show its unavailable state.

- [ ] **Step 4: Implement catalog state**

Derive pages and spreads with `useMemo`. Clamp `spreadIndex` whenever filtering or song count changes. Render the right page only when it exists. Provide previous/next buttons with descriptive labels and disabled boundaries.

- [ ] **Step 5: Implement input behavior**

- `ArrowLeft`/`ArrowRight`: desktop spread navigation.
- `ArrowUp`/`ArrowDown`: mobile-friendly navigation.
- `Escape`: close.
- Touch pointer delta beyond 40 CSS pixels: one page move.
- Opening moves focus to the selected card or first card.
- Closing returns focus through an opener ref owned by the player.

- [ ] **Step 6: Run tests**

Run: `npm test -- src/components/jukebox/jukebox-catalog.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/jukebox/song-card.tsx src/components/jukebox/jukebox-catalog.tsx src/components/jukebox/jukebox-catalog.test.ts
git commit -m "feat: add generated jukebox catalog"
```

### Task 5: Reusable Player and Machine

**Files:**

- Create: `src/components/jukebox/jukebox-player.tsx`
- Create: `src/components/jukebox/jukebox-machine.tsx`
- Modify: `src/app/site-shell.tsx`
- Modify or remove after migration: `src/components/reference-jukebox.tsx`
- Add: `public/images/jukebox-basis-2026-08-01.jpeg`

**Interfaces:**

- Consumes: `JukeboxCatalog` and `PublicJukeboxSong[]`.
- Produces: `JukeboxPlayer({ initialSongs, standalone?: boolean })`.
- Owns: exactly one `HTMLAudioElement`, selection, playing, current time, duration, catalog visibility, and error state.

- [ ] **Step 1: Add the supplied artwork**

Copy the approved uploaded JPEG byte-for-byte to `public/images/jukebox-basis-2026-08-01.jpeg`. Verify its checksum before and after copying.

- [ ] **Step 2: Implement machine presentation**

`JukeboxMachine` renders the artwork with `alt="Classic chrome jukebox"`, Now Playing data, catalog opener, previous, play/pause, next, and a labelled seek range. Controls remain functional if the image fails.

- [ ] **Step 3: Implement player state**

Create one audio ref. On selection:

```ts
audio.src = song.audioUrl ?? "";
audio.load();
if (song.audioUrl) await audio.play();
```

Catch rejected play promises and show `Tap play to start`. Listen for `timeupdate`, `durationchange`, `play`, `pause`, `ended`, and `error`. At `ended`, advance to the next playable song without wrapping past an empty list.

- [ ] **Step 4: Handle catalog mutations safely**

If a refreshed catalog removes the current song, pause, clear the source, and select the first playable remaining song. If no playable songs exist, retain the deliberate empty/unavailable state.

- [ ] **Step 5: Migrate homepage**

Replace `ReferenceJukebox` and the second duplicated `JukeboxSongWheel` with one shared `JukeboxPlayer`. Preserve request-form song inputs and the unrelated homepage sections.

- [ ] **Step 6: Run checks**

Run: `npm test && npx tsc --noEmit`  
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add public/images/jukebox-basis-2026-08-01.jpeg src/components/jukebox src/app/site-shell.tsx src/components/reference-jukebox.tsx src/app/jukebox/page.tsx
git commit -m "feat: build reusable working jukebox player"
```

### Task 6: Audio Upload, Metadata, and Admin Controls

**Files:**

- Create: `src/app/api/admin/songs/audio/metadata.ts`
- Create: `src/app/api/admin/songs/audio/metadata.test.ts`
- Create: `src/app/api/admin/songs/audio/route.ts`
- Modify: `src/app/api/songs/route.ts`
- Modify: `src/app/admin/admin-app.tsx`
- Modify: `package.json`

**Interfaces:**

- Produces: authenticated multipart upload accepting `songId` and `file`, returning `{ audioUrl, durationSeconds }`.
- Consumes: existing admin authentication helper and the repository's production-safe storage mechanism.
- Constraint: do not write runtime uploads to ephemeral Vercel `public/`; use configured persistent object storage or explicitly block production upload until it is configured.

- [ ] **Step 1: Choose the existing persistent storage adapter**

Search the repository and Vercel configuration for Blob/S3/Supabase storage. Reuse it if present. If none exists, add Vercel Blob with a server-only token and document `BLOB_READ_WRITE_TOKEN`. Do not store the token in Git.

- [ ] **Step 2: Add metadata dependency only if required**

Prefer browser/client duration extraction for a fast admin preview and server verification from a bounded metadata library. Add exactly one maintained dependency; record it in the lockfile.

- [ ] **Step 3: Write failing validation tests**

Cover accepted MP3/WAV MIME types, rejected executable/text types, zero-byte files, oversized files, nonfinite duration, negative duration, and duration rounding to integer seconds.

- [ ] **Step 4: Implement bounded metadata validation**

Export:

```ts
export const MAX_AUDIO_BYTES = 200 * 1024 * 1024;
export function validateAudioUpload(file: Pick<File, "size" | "type">): void;
export function normalizeDuration(seconds: number | null): number | null;
```

Throw user-safe errors without echoing credentials or storage internals.

- [ ] **Step 5: Implement authenticated upload/replace**

Confirm admin session before reading the body. Validate `songId`, file type, and size. Upload to persistent storage, persist `audioUrl` and `durationSeconds`, and only then delete a replaced object if it is owned by this app.

- [ ] **Step 6: Extend admin UI**

Add inputs for title, artist, album, order, public visibility, and audio. Show calculated duration, preview, replacement, edit, and delete. Delete requires a confirmation that distinguishes record deletion from owned-file deletion.

- [ ] **Step 7: Run checks**

Run: `npm test && npx tsc --noEmit`  
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/app/api/admin/songs/audio src/app/api/songs/route.ts src/app/admin/admin-app.tsx
git commit -m "feat: manage jukebox audio in admin"
```

### Task 7: Responsive Chrome-and-Flipbook Presentation

**Files:**

- Modify: `src/app/globals.css`
- Modify: `src/components/jukebox/jukebox-machine.tsx`
- Modify: `src/components/jukebox/jukebox-catalog.tsx`

**Interfaces:**

- Consumes: semantic class names from Tasks 4 and 5.
- Produces: desktop horizontal two-page spread and narrow vertical movement without changing catalog data behavior.

- [ ] **Step 1: Style the full-size standalone stage**

Use the artwork's `1122 / 1402` aspect ratio. Keep the machine within `min(94vw, 52rem)`, center it, and use a black reflective stage that does not compete with chrome highlights.

- [ ] **Step 2: Position real controls**

Use percentage-based overlay zones tied to the image. Keep the Now Playing display readable and controls at least 44 CSS pixels. Do not use an image map.

- [ ] **Step 3: Style the catalog transition**

Closed: translated below the lower cabinet and inert.  
Open: translated over the lower half.  
Desktop: two facing pages with a shallow center fold.  
Narrow: one page viewport and vertical navigation.

- [ ] **Step 4: Add accessible visual states**

Add visible `:focus-visible`, selected card, disabled, loading, unavailable, and retry states. Ensure WCAG-readable text contrast over reflective areas.

- [ ] **Step 5: Respect reduced motion**

Under `@media (prefers-reduced-motion: reduce)`, remove page-flip rotation, parallax, and long transitions while preserving open/close visibility.

- [ ] **Step 6: Check breakpoints**

Visually inspect widths `390, 768, 1024, 1440` pixels. Verify no horizontal document overflow, cropped controls, or overlapping song labels.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/components/jukebox/jukebox-machine.tsx src/components/jukebox/jukebox-catalog.tsx
git commit -m "style: finish responsive jukebox catalog"
```

### Task 8: Documentation, Regression Gates, and Deployment

**Files:**

- Modify: `README.md`
- Modify: `docs/INSTALL.md`
- Modify only if required by verified configuration: Vercel project/environment settings and DNS.

**Interfaces:**

- Consumes: completed feature and production configuration.
- Produces: verified `https://live.georgegrissom.com/jukebox`.

- [ ] **Step 1: Document admin workflow**

Explain add, metadata edit, upload/replace, duration correction, ordering, public visibility, preview, and the two deletion choices.

- [ ] **Step 2: Document production environment**

List required variable names without values. Include database and persistent audio storage variables. Explain that Vercel filesystem writes are not persistent.

- [ ] **Step 3: Run focused gates**

Run:

```bash
npm test
npx tsc --noEmit
npx prisma validate
```

Expected: every command exits 0.

- [ ] **Step 4: Run the production build as a durable Process Job if it exceeds or may exceed 60 seconds**

Run the foreground payload through Codex Process Jobs:

```bash
npm run build
```

Expected: tracked job reaches a successful terminal result; no immediate polling in the launch turn.

- [ ] **Step 5: Inspect the build**

Verify routes include `/`, `/jukebox`, `/admin`, and the relevant song/audio APIs. Verify no private fields or tokens are emitted in client bundles or public API responses.

- [ ] **Step 6: Reconcile GitHub and Vercel**

Confirm Vercel's linked repository is `ggrissom/GeorgeGrissomLive`, production branch is `main`, the deployed commit matches the reviewed commit, and required environment variables exist.

- [ ] **Step 7: Deploy**

Perform a normal production deployment. Do not rewrite DNS unless the existing domain mapping is proven incorrect.

- [ ] **Step 8: Verify live behavior**

At `https://live.georgegrissom.com/jukebox` verify:

- HTTPS success.
- Artwork loads.
- Catalog contains exactly the real songs.
- Final partial page has no blanks.
- Both supplied audio files load and play.
- Seek, pause, next, catalog open/close, keyboard, and mobile touch navigation work.
- Homepage, admin, setlists, calendar, requests, uploads, and booking still load.

- [ ] **Step 9: Commit documentation**

```bash
git add README.md docs/INSTALL.md
git commit -m "docs: document jukebox administration and deployment"
```

- [ ] **Step 10: Final reviewed push**

Push reviewed commits normally to `main` only after all gates pass. Record the deployed commit SHA and live verification result in the handoff.

# Implementation Notes — 20260630-1627 — SoftwareArchitectGPT

## Completed

- Added private admin setlists with create, duplicate, delete, show/venue association, created date, notes, and song ordering.
- Added many-to-many `Song` ↔ `Setlist` support through `SetlistSong`.
- Added setlist song assignment by checking boxes in the setlist builder.
- Added song-to-setlist association by typing setlist names from the song admin area.
- Added Google Performance Calendar service-account integration.
- Admin event creation now attempts to create/update Google Calendar events and records sync status.
- Public calendar now reads from the Performance Calendar adapter when Google credentials are configured and falls back to local events otherwise.
- Rebuilt the public jukebox as a straight-on image-based module using the supplied chrome/glass jukebox reference artwork.
- Removed the inward rotation; the public jukebox now stays straight-on like the uploaded image.
- Replaced the public song list with a lightweight scroll-wheel selector that only renders the visible window.
- Updated README, install docs, architecture spec, env example, Prisma schema, seed data, and package dependencies.
- Added this chat transcript under `docs/`.

## Important Setup Step

After unzipping, run:

```bash
cp .env.example .env
npm run setup
npm run dev
```

For Google Calendar sync, share the Performance Calendar with the configured service account email and grant permission to make changes.

## Validation Performed Here

- Installed npm dependencies successfully.
- Ran a TypeScript parser/transpile check on the changed `.ts` and `.tsx` files successfully.

## Validation Not Completed Here

`npx prisma generate` could not complete in this environment because the Prisma CLI could not download its schema-engine binary from `binaries.prisma.sh` due DNS/network failure:

```txt
getaddrinfo EAI_AGAIN binaries.prisma.sh
```

That is an environment/network issue, not an app-code failure. A contractor should run `npm run setup` on a machine with normal internet access to generate Prisma Client, push the SQLite schema, seed sample data, and then run the app.


## Correction Applied After Preview Feedback

- Added `public/images/reference-jukebox.png` from the supplied uploaded jukebox artwork.
- Added reusable module `src/components/reference-jukebox.tsx`.
- Updated `src/app/site-shell.tsx` to use the reference artwork module instead of the CSS-drawn jukebox shell.
- Added CSS overlay positioning for the Now Playing display, credit display, and compact scroll-wheel song selector inside the jukebox artwork.

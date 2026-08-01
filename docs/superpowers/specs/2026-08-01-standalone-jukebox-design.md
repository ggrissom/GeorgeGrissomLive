# Standalone Jukebox Design

Date: 2026-08-01  
Status: Approved  
Repository: `ggrissom/GeorgeGrissomLive`

## Goal

Turn the supplied straight-on chrome jukebox artwork into a working, intuitive music player backed by the existing GeorgeGrissomLive song catalog and admin system. The player will have a dedicated `/jukebox` page and remain reusable on the main music site.

## Product Decisions

- Preserve the supplied jukebox artwork as the dominant visual.
- Add a dedicated `/jukebox` route.
- Reuse the same jukebox component on the homepage where appropriate.
- A **Catalog** control raises a physical-looking two-page song-card flipbook over the lower half of the machine.
- Desktop page navigation moves left to right.
- Narrow mobile layouts use vertical page movement when that is easier to operate.
- Show five songs on each visible page, ten per spread.
- Calculate the number of pages from the current song count.
- Never render blank catalog pages or empty placeholder song cards.
- Each card shows artist, song title, album, and duration.
- When an album is absent, show `SINGLE`.
- The currently selected song drives the machine's Now Playing display.
- Real audio playback uses the song's uploaded audio asset.
- Admin can add, edit, reorder, and delete jukebox songs.

## User Experience

### Closed State

The jukebox is presented straight on. The supplied chrome shell fills the available stage without being stretched or cropped in a way that hides controls. Its central display shows:

- Now Playing
- Song title
- Artist
- Play/pause state
- Current time and duration
- A progress control
- Next
- Catalog

The artwork remains visible around the controls. Interactive overlays must follow the perspective, borders, and visual hierarchy of the physical machine.

### Catalog State

Selecting **Catalog** raises the catalog from below and positions it in front of the lower half of the jukebox. The upper arch and Now Playing area remain visible.

The catalog resembles an old compact jukebox title-card holder:

- Two facing pages on desktop.
- Five song cards per page.
- Album or `SINGLE` presented consistently.
- Duration aligned for quick scanning.
- Active song visibly selected.
- Previous and next page controls.
- Swipe, wheel, keyboard, and button navigation where supported.
- Closing the catalog returns focus to the Catalog control.

Partial final pages show only real songs and contract naturally. The spread count is derived from the filtered song list.

### Playback

Selecting a song loads it into a single persistent HTML audio element and begins playback when browser autoplay rules permit. If playback requires a user gesture, the selected song is loaded and a clear play control remains ready.

The player supports:

- Play and pause
- Seek
- Previous and next
- Automatic advance at track end
- Loading state
- Unavailable-file state
- Keyboard-accessible controls
- Screen-reader labels
- Reduced-motion preferences

The selected track, playback time, catalog page, and open/closed state remain synchronized.

## Song Data

Extend the existing `Song` model only where required. Public jukebox data includes:

- `id`
- `title`
- `artist`
- `album`
- `audioUrl`
- `durationSeconds`
- `jukeboxOrder`
- `isPublic`

Display fallbacks:

- Missing artist: `George Grissom` only when the record is explicitly one of George's songs; otherwise `Unknown Artist`.
- Missing album: `SINGLE`.
- Missing duration: calculate from the uploaded audio file or show a non-misleading unavailable indicator until calculation succeeds.

Private lyrics, chords, rehearsal notes, storage credentials, and admin-only fields are never included in the public jukebox response.

## Admin Experience

The existing admin Songs area gains jukebox-specific fields and actions:

- Upload or replace audio.
- Title.
- Artist.
- Album.
- Duration, normally read automatically from the uploaded file.
- Public/jukebox visibility.
- Sort position.
- Preview playback.
- Edit.
- Delete with confirmation.

Audio upload validation covers supported MIME type, maximum size, unreadable metadata, and failed storage. Deletion distinguishes between removing the catalog record and removing its stored audio asset so files are not destroyed accidentally.

## Architecture

### Components

- `JukeboxPlayer`: owns selected track and audio state.
- `JukeboxMachine`: artwork and embedded machine controls.
- `JukeboxCatalog`: open/closed catalog surface and navigation.
- `CatalogSpread`: computes only the pages needed for the supplied songs.
- `SongCard`: accessible selectable title card.
- `JukeboxAdminFields`: focused admin editor additions.
- Public jukebox API/service: returns safe ordered song metadata.

Each component has one primary responsibility and communicates through typed props or a focused player state hook.

### State Flow

1. Fetch ordered public songs.
2. Normalize display fallbacks without mutating stored metadata.
3. Select the first playable song or restore the session selection.
4. Derive catalog pages from the filtered array.
5. Selecting a song updates the audio source and Now Playing display.
6. Audio events update progress and advance to the next playable song.
7. Admin mutations invalidate or refresh the song collection.

## Artwork Handling

The supplied source image is added to the repository as a versioned jukebox asset. It is not used as an inaccessible full-page image map. Interactive controls are real HTML elements positioned over or adjacent to appropriate visual zones.

Use responsive object fitting, bounded aspect ratios, and CSS variables for overlay alignment. The design should remain usable if the image cannot load by retaining functional player controls and readable song information.

## Error Handling

- Empty catalog: show a deliberate “Songs coming soon” state with no blank pages.
- Missing audio: keep the song visible only if intended, disable playback, and explain that the track is unavailable.
- Failed audio load: retain selection and allow retry or another song.
- Failed catalog request: show a compact retry action.
- Upload failure: preserve the form values and return a specific error.
- Duration extraction failure: save safely only when permitted and flag the song for admin correction.
- Deleted current song: stop playback and select the next available track.

## Responsive and Accessibility Requirements

- Touch targets are at least 44 by 44 CSS pixels.
- Controls work without hover.
- Text remains legible over reflective artwork.
- Focus is visible.
- Catalog can be opened, browsed, selected, and closed by keyboard.
- Semantic buttons and range inputs replace decorative click targets.
- Motion respects `prefers-reduced-motion`.
- The page works on current iPhone/iPad Safari and modern desktop browsers.

## Testing

### Unit and Component Tests

- Page/spread count for 0, 1, 5, 6, 10, 11, and larger song counts.
- No blank song cards.
- `SINGLE` fallback.
- Duration formatting.
- Selection and automatic advance.
- Missing/unplayable audio.
- Catalog keyboard navigation and focus return.

### Integration Tests

- Public jukebox API returns only allowed fields in the correct order.
- Admin creates and edits a song with an audio file.
- Duration is persisted after upload.
- Admin deletion behaves according to the confirmed choice.
- Homepage and `/jukebox` share the same working player component.

### Release Verification

- Production build passes.
- Database migration applies cleanly.
- Desktop and mobile layouts are visually inspected.
- Both supplied songs play from their deployed storage locations.
- Vercel environment and database configuration match the repository.
- `live.georgegrissom.com/jukebox` loads successfully over HTTPS.
- Existing homepage, admin, setlist, calendar, and request flows remain functional.

## Delivery Sequence

1. Reconcile the repository, deployment branch, and current Vercel project.
2. Add the artwork and audio assets through the production-safe storage path.
3. Update the song schema and migration.
4. Extend the song API and admin workflow.
5. Build the reusable working player.
6. Build the generated two-page catalog.
7. Add the standalone route and homepage integration.
8. Run focused tests and the full production build.
9. Deploy, verify the live domain, and document the final admin workflow.

## Out of Scope for This Pass

- Paid credits or coin accounting.
- Public song requests and tipping changes.
- Lyric display or karaoke synchronization.
- Music licensing automation.
- Native iOS or Android apps.
- Replacing the existing setlist system.

These can use the same song catalog later without delaying the working jukebox.

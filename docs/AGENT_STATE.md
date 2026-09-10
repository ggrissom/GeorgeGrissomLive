# GeorgeGrissomLive Agent State

This file is the durable cross-agent handoff log for ChatGPT, Claude via Perplexity, Codex/Copilot, Vercel Agent, and other implementation agents working on GeorgeGrissomLive.

## Coordination rules

Every agent that changes or materially audits the project should append/update a short entry containing:

- Timestamp (America/Los_Angeles when practical)
- Agent identity
- Task received
- Branch
- Starting commit
- Ending commit
- Files/systems changed
- Deployment URL/status
- Database/storage/calendar/Stripe effects
- Tests actually run
- Production verification actually performed
- Unresolved blockers
- Recommended next owner/task

Also leave a concise equivalent in the relevant PR/issue comment when one exists.

Never put credentials, tokens, private keys, secrets, or payment data in this file.

## Canonical project references

- Repository: `ggrissom/GeorgeGrissomLive`
- Production branch: `main`
- Vercel team: `ByGeorge` / `bygeorge`
- Vercel project: `george-grissom-live`
- Public domains to verify: `georgegrissom.com`, `www.georgegrissom.com`, `live.georgegrissom.com`
- Performance Calendar ID: `0d93f3b5191f80e930ce0cdb7249a796230adbd8ba2049e7e4e323ffc632cf68@group.calendar.google.com`
- Audio manifest: `docs/audio-assets.json`
- Audio catalog code: `src/lib/audio-catalog.ts`
- Standalone player: `src/components/jukebox-player/`

## Audio source of truth

Do not put paid/full audio masters into this public repository merely to make deployment easier.

The current audio manifest records seven processed tracks and their Google Drive file IDs. Runtime delivery should use durable production storage (prefer Vercel Blob/private storage for protected full-length assets, with public or appropriately protected preview delivery) rather than ephemeral Vercel filesystem paths.

Current Drive folder IDs recorded in `docs/audio-assets.json`:

- Drive root: `1xVusRvzgfFFGlav2BC668qwAetP5O6bd`
- MP3 folder: `1nehMnQIlk7-JJPfxsRP0Uj3Wh0V2x535`
- Full MP3 folder: `1SBRPXh2yFb9FrjS1K2GvlvPKz3EwhNlI`
- Preview MP3 folder: `1SBAI8m1T4b72Xd1vD9J44l5lSFcxoRaK`
- WAV archive folder: `1YqW_Byz0XBAqOMsjM-y91_NlxIprVe9m`

Current delivery policy recorded by the repository: 30-second 192 kbps MP3 previews; purchased downloads are full-length 320 kbps MP3 files; WAV files remain archived and are not delivered by the website.

## 2026-09-06 baseline

Agent: ChatGPT

Task: Repair Performance Calendar integration and prepare the project for handoff to Claude via Perplexity.

Latest production-main commits at this baseline:

- `69d0fafcae8bbcf9410e34c374825ecb37a64da3` — Use public Google Calendar feed for live performance dates
- `b18db01192deac014c10065b448bdcf133edec44` — Prefer live public Performance Calendar over stale local fallback

Calendar behavior now intended:

Google Performance Calendar → structured event data → native GeorgeGrissom.com calendar cards. Do not embed the Google Calendar iframe UI.

Smoke-test event visible in the Performance Calendar at this baseline: `SHOW at Hatch Cantina`, 2026-09-26 20:30–22:00 America/Los_Angeles. This event is a verification target only and must not be hardcoded.

Important open work:

- PR #8: `Harden production path: preserve full catalog, disable destructive build seeding, and move uploads to durable storage`. This was subsequently merged on 2026-09-06.
- PR #9: `Install and configure Vercel Web Analytics`. Lower priority than functional production repair.

## 2026-09-10 jukebox catalog + player repair

Agent: ChatGPT

Task: Put all seven documented MP3 catalog songs on the public site and update the image-based jukebox with functional controls.

Initial implementation commit before standalone extraction: `bdb5711156de11da1c7d2af6ea5a4fe770963fcb`.

## 2026-09-10 standalone jukebox player integration

Agent: ChatGPT

Task: Move the jukebox player into its own self-contained GitHub folder in the existing repository, integrate that standalone module into the website, guarantee the canonical seven songs are published without duplicates, and improve production playback reliability.

Branch: `main`

Implementation:

- `src/components/jukebox-player/JukeboxPlayer.tsx` — standalone player UI and HTMLAudioElement synchronization.
- `src/components/jukebox-player/JukeboxPlayer.module.css` — player-local controls, progress, picker and skin-overlay styling.
- `src/components/jukebox-player/player-state.ts` — dedupe and previous/next wrap behavior.
- `src/components/jukebox-player/player-state.test.ts` — state regression tests.
- `src/components/jukebox-player/index.ts` — standalone module export.
- `src/components/reference-jukebox.tsx` is now only a compatibility re-export, so the existing website consumes the standalone module without duplicating implementation.
- `src/lib/ensure-audio-catalog.ts` now creates missing canonical rows and repairs canonical rows that are unpublished or have broken delivery paths, without deleting unrelated songs.
- `src/app/page.tsx` restricts and orders the public jukebox to the seven canonical `AUDIO_CATALOG` slugs, eliminating duplicate/placeholder rows from the player.
- `src/lib/audio-storage.ts` prefers authenticated Google Drive delivery when configured and now attempts Google Drive link-shared media delivery before local fallback when service-account environment variables are absent.

Canonical picker tracks: One Question; What a Shame; This Song Is About You; Damnit, Just You Hold On; Get In Loser; And Another Thing; Nose to the Grindstone.

Controls: previous, play/pause, next, enlarged mute/unmute speaker icon next to the volume slider, accurate elapsed/duration tracking, draggable star progress control, and a scrollable seven-song picker. Shuffle and repeat are not included.

Tests actually run: local Node 22 unit test cycle for `dedupeSongs` and `adjacentSongIndex`; test first failed because implementation was absent, then passed after implementation: 2 passed, 0 failed.

Deployment verification: GitHub's Vercel status for code commit `6172f8d733cf448b32abebaf5cd3ec681292141f` reached `success`.

Runtime verification limitation: the connected Vercel project/deployment inspection tools did not resolve this project and the Opera Browser Connector was not connected, so an actual production audio request was not exercised in this session. Do not claim browser playback is proven until it is exercised. The Drive no-credential fallback requires the referenced audio files to permit link-shared unauthenticated download; otherwise production must use the existing Google service-account environment variables or private durable blob delivery.

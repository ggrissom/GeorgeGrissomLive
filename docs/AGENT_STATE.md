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

- PR #8: `Harden production path: preserve full catalog, disable destructive build seeding, and move uploads to durable storage`. This is a draft and should be rebased/reviewed against current `main`, not blindly merged.
- PR #9: `Install and configure Vercel Web Analytics`. Lower priority than functional production repair.

Known production problems requiring Claude via Perplexity ownership:

- Production public catalog has collapsed to only a small subset / two songs in observed UI.
- Audio playback/storage path is not reliably production-safe.
- End-to-end jukebox behavior must be verified: catalog → selection → full/free play → preview → Stripe purchase → entitlement → download.
- Build-time database mutation/destructive seeding must not be used.
- Fan uploads need durable storage.
- Custom-domain routing must be verified independently of Vercel preview success.

Recommended next owner/task: Claude via Perplexity — inspect current `main`, all open PRs, production deployment/runtime/data/storage, then restore the full functional jukebox/catalog with durable audio delivery and production verification.

## 2026-09-10 jukebox catalog + player repair

Agent: ChatGPT

Task: Put all seven documented MP3 catalog songs on the public site and update the image-based jukebox with the requested functional controls: previous, play/pause, next, mute, volume, star progress scrubber, and a scrollable picker list.

Branch: `main`

Starting commit: `52c591255899a769381d6b46c578231c97434eee`

Ending implementation commit before this log entry: `bdb5711156de11da1c7d2af6ea5a4fe770963fcb`

Files changed:

- `src/lib/ensure-audio-catalog.ts` — non-destructive repair that creates only missing canonical rows for the seven documented audio assets.
- `src/app/page.tsx` — runs the safe missing-row repair before loading public songs; failures are logged without taking the page down.
- `src/components/reference-jukebox.tsx` — custom previous/play-pause/next/mute/volume controls, actual now-playing title tracking, seek/progress state, hidden native audio element, and scrollable picker behavior.
- `src/components/reference-jukebox-player.module.css` — horizontal transport styling, star-shaped progress thumb, volume control, visible side scrollbar, and stable picker-row styling.

Catalog assets preserved from `src/lib/audio-catalog.ts`: One Question; What a Shame; This Song Is About You; Damnit, Just You Hold On; Get In Loser; And Another Thing; Nose to the Grindstone.

Database/storage effects: no destructive seed and no audio binaries added to the public repository. The site creates only missing Song rows from the existing seven-track canonical manifest when the public homepage runs. Existing song records are not overwritten.

Calendar/Stripe effects: none intentionally changed.

Verification: GitHub/Vercel status for implementation commit `bdb5711156de11da1c7d2af6ea5a4fe770963fcb` reached `success`. Production custom-domain rendering and actual browser audio playback still require an HTTP/browser smoke test because the available Vercel connector could not enumerate/fetch this project despite the GitHub Vercel deployment check succeeding.

Recommended next task: browser smoke-test the production custom domain for seven visible songs and exercise selection, play/pause, previous/next, mute, volume, seeking, preview limit, and one full-track playback path before making additional visual changes.

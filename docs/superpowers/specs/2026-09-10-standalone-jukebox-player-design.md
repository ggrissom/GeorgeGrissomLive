# Standalone Jukebox Player Design

## Goal
Create a self-contained jukebox player subsystem in `src/components/jukebox-player/` and integrate it into the existing GeorgeGrissomLive homepage without creating a separate route or app.

## Requirements
- Use the approved jukebox artwork as the player skin.
- Player controls: previous, play/pause, next, large mute/unmute icon beside volume slider.
- No separate MUTE text button, no shuffle, no repeat.
- Accurate seek/progress bar tied to the actual HTMLAudioElement currentTime/duration.
- Picker shows the seven canonical audio catalog songs exactly once.
- Playback uses existing protected `/api/songs/[id]/play` and `/api/audio/[slug]` flow.
- Public player must not collapse merely because production DB rows are missing or unpublished; canonical seven-track audio catalog remains the display source and the play API reconciles missing rows safely on demand.
- No destructive deployment seeding.
- Existing purchase/preview logic remains compatible.
- Integrate the standalone component into the homepage; no test/demo route.

## Architecture
`src/components/jukebox-player/` owns the UI, playback state synchronization, song deduplication, picker, and scoped styles. It receives songs plus the existing `onPlay` callback from the site. The homepage constructs the public seven-song list by merging database metadata with the canonical `AUDIO_CATALOG`, while the play and checkout APIs resolve by database id or slug and create/reconcile only a missing canonical song when needed.

## Validation
- Unit test dedupe and previous/next wrap logic.
- Vercel production build must succeed.
- Verify main points at the deployed production URL/API after deployment where connector access permits.

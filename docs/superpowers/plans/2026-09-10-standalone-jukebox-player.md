# Standalone Jukebox Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a self-contained functional jukebox player using the canonical seven-song catalog.

**Architecture:** A new `src/components/jukebox-player/` folder owns the player component, picker, state helpers, tests, and CSS module. `page.tsx` merges canonical catalog entries with DB rows so all seven display; playback/checkout APIs resolve id-or-slug and safely reconcile missing canonical rows.

**Tech Stack:** Next.js 15, React 18, TypeScript, Prisma/PostgreSQL, HTMLAudioElement, CSS Modules, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-10-standalone-jukebox-player-design.md`

## Global Constraints
- No separate demo route.
- No shuffle or repeat.
- No destructive build-time seeding.
- Exactly one picker row per canonical song.
- Preserve protected audio delivery and Stripe purchase flow.

---

### Task 1: Player state helpers
**Files:** Create `src/components/jukebox-player/player-state.ts`; create `src/components/jukebox-player/player-state.test.ts`.
**Interfaces:** `dedupeSongs<T>()`, `adjacentSongIndex()`.
- [ ] Write failing tests for duplicate collapse and previous/next wrapping.
- [ ] Run tests and confirm RED.
- [ ] Implement helpers.
- [ ] Run tests and confirm GREEN.

### Task 2: Standalone player component
**Files:** Create `src/components/jukebox-player/JukeboxPlayer.tsx`; create `src/components/jukebox-player/JukeboxPlayer.module.css`; create `src/components/jukebox-player/index.ts`.
**Interfaces:** Receives songs, plays, catalogUnlocked, currentSong, selection/play callbacks, and shared audio ref.
- [ ] Move player/picker behavior into isolated folder.
- [ ] Implement previous/play-pause/next, icon mute/unmute + volume, accurate seek/progress, and seven-row scroll picker.
- [ ] Keep NOW PLAYING bound to the audio that actually started.

### Task 3: Canonical seven-song publication path
**Files:** Modify `src/app/page.tsx`; modify `src/app/api/songs/[id]/play/route.ts`; modify `src/app/api/checkout/route.ts`.
**Interfaces:** Catalog slugs may be used as stable public identifiers; APIs resolve either id or slug.
- [ ] Merge DB metadata into `AUDIO_CATALOG` without duplicates for homepage data.
- [ ] Reconcile missing canonical DB song row only when playback needs it.
- [ ] Keep checkout compatible with slug identifiers.

### Task 4: Integrate and publish
**Files:** Modify `src/app/site-shell.tsx`; update `docs/AGENT_STATE.md`.
- [ ] Replace old component import with standalone folder export.
- [ ] Confirm Vercel production build status is success.
- [ ] Verify deployed player/API where available and record any external-runtime limitation accurately.

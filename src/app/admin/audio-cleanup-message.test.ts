import assert from "node:assert/strict";
import test from "node:test";

import { actionableAudioCleanupMessage } from "./audio-cleanup-message";

test("surfaces exact actionable cleanup details even for a successful response", () => {
  assert.equal(
    actionableAudioCleanupMessage({
      ok: true,
      cleanupRequired: {
        audioUrl: "https://store.example/jukebox-audio/song-1/orphan.mp3",
        pathname: "jukebox-audio/song-1/orphan.mp3",
      },
    }),
    "Cleanup required: delete https://store.example/jukebox-audio/song-1/orphan.mp3 (Blob path: jukebox-audio/song-1/orphan.mp3) from the configured Vercel Blob store, then retry the action.",
  );
});

test("returns no cleanup message when no manual cleanup is required", () => {
  assert.equal(actionableAudioCleanupMessage({ ok: true }), null);
});

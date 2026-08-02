import assert from "node:assert/strict";
import test from "node:test";

import { actionableAudioCleanupMessage } from "./audio-cleanup-message";

test("successful actions request only manual deletion and never a retry", () => {
  assert.equal(
    actionableAudioCleanupMessage({
      ok: true,
      cleanupRequired: {
        audioUrl: "https://store.example/jukebox-audio/song-1/orphan.mp3",
        pathname: "jukebox-audio/song-1/orphan.mp3",
      },
    }, true),
    "Action completed. Manually delete https://store.example/jukebox-audio/song-1/orphan.mp3 (Blob path: jukebox-audio/song-1/orphan.mp3) from the configured Vercel Blob store.",
  );
});

test("failed actions retain cleanup and retry guidance", () => {
  assert.equal(
    actionableAudioCleanupMessage({
      cleanupRequired: {
        audioUrl: "https://store.example/jukebox-audio/song-1/orphan.mp3",
        pathname: "jukebox-audio/song-1/orphan.mp3",
      },
    }, false),
    "Cleanup required: delete https://store.example/jukebox-audio/song-1/orphan.mp3 (Blob path: jukebox-audio/song-1/orphan.mp3) from the configured Vercel Blob store, then retry the action.",
  );
});

test("returns no cleanup message when no manual cleanup is required", () => {
  assert.equal(actionableAudioCleanupMessage({ ok: true }), null);
});

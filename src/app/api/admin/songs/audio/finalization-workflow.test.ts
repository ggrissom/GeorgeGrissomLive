import assert from "node:assert/strict";
import test from "node:test";

import { settleAudioCasResult } from "./finalization-workflow";

const upload = {
  audioUrl: "https://store.example/jukebox-audio/song-1/new.mp3",
  pathname: "jukebox-audio/song-1/new.mp3",
  reason: "concurrent_finalization_lost",
};

test("accepts the upload only when the optimistic song update wins", async () => {
  assert.deepEqual(
    await settleAudioCasResult(
      1,
      upload,
      async () => null,
      async () => ({ status: "deleted" }),
    ),
    { status: "attached" },
  );
});

test("treats duplicate finalization of the winning Blob as idempotent", async () => {
  let cleanupCalls = 0;
  assert.deepEqual(
    await settleAudioCasResult(
      0,
      upload,
      async () => ({
        audioUrl: upload.audioUrl,
        audioStoragePath: upload.pathname,
      }),
      async () => {
        cleanupCalls += 1;
        return { status: "deleted" };
      },
    ),
    { status: "idempotent" },
  );
  assert.equal(cleanupCalls, 0);
});

test("cleans or queues the losing upload when optimistic update loses", async () => {
  assert.deepEqual(
    await settleAudioCasResult(
      0,
      upload,
      async () => ({
        audioUrl: "https://store.example/jukebox-audio/song-1/winner.mp3",
        audioStoragePath: "jukebox-audio/song-1/winner.mp3",
      }),
      async () => ({
        status: "untracked",
        audioUrl: upload.audioUrl,
        pathname: upload.pathname,
      }),
    ),
    {
      status: "conflict",
      cleanup: {
        status: "untracked",
        audioUrl: upload.audioUrl,
        pathname: upload.pathname,
      },
    },
  );
});

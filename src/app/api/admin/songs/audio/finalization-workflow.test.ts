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
    await settleAudioCasResult(1, upload, async () => ({ status: "deleted" })),
    { status: "attached" },
  );
});

test("cleans or queues the losing upload when optimistic update loses", async () => {
  assert.deepEqual(
    await settleAudioCasResult(0, upload, async () => ({
      status: "untracked",
      audioUrl: upload.audioUrl,
      pathname: upload.pathname,
    })),
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

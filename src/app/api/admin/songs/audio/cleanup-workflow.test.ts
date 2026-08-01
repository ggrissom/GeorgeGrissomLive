import assert from "node:assert/strict";
import test from "node:test";

import { settleAudioCleanup } from "./cleanup-workflow";

const task = {
  audioUrl: "https://store.public.blob.vercel-storage.com/jukebox-audio/song-1/old.mp3",
  pathname: "jukebox-audio/song-1/old.mp3",
  reason: "replacement",
};

test("reports a completed cleanup when owned deletion succeeds", async () => {
  assert.deepEqual(
    await settleAudioCleanup(task, {
      remove: async () => true,
      enqueue: async () => undefined,
    }),
    { status: "deleted" },
  );
});

test("persists a retry when immediate owned deletion fails", async () => {
  assert.deepEqual(
    await settleAudioCleanup(task, {
      remove: async () => {
        throw new Error("temporary Blob failure");
      },
      enqueue: async () => undefined,
    }),
    { status: "queued" },
  );
});

test("returns the only orphan URL when deletion and retry persistence both fail", async () => {
  assert.deepEqual(
    await settleAudioCleanup(task, {
      remove: async () => {
        throw new Error("temporary Blob failure");
      },
      enqueue: async () => {
        throw new Error("database unavailable");
      },
    }),
    {
      status: "untracked",
      audioUrl: task.audioUrl,
      pathname: task.pathname,
    },
  );
});

test("never deletes or queues a URL without explicit persisted ownership path", async () => {
  assert.deepEqual(
    await settleAudioCleanup(
      { ...task, pathname: null },
      {
        remove: async () => true,
        enqueue: async () => undefined,
      },
    ),
    { status: "skipped" },
  );
});

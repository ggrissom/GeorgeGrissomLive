import assert from "node:assert/strict";
import test from "node:test";

import {
  isBlobUploadCompletionBody,
  recordCompletedAudioUpload,
  settleExpiredAudioUpload,
} from "./upload-reservation-workflow";

const completed = {
  blob: {
    url: "https://store.public.blob.vercel-storage.com/jukebox-audio/song-1/upload.mp3",
    pathname: "jukebox-audio/song-1/upload.mp3",
    downloadUrl: "https://store.public.blob.vercel-storage.com/jukebox-audio/song-1/upload.mp3?download=1",
    contentType: "audio/mpeg",
    contentDisposition: "attachment",
  },
  tokenPayload: JSON.stringify({
    reservationId: "reservation-1",
    songId: "song-1",
    pathname: "jukebox-audio/song-1/upload.mp3",
  }),
};

test("recognizes only the SDK upload-completed event as callback-authenticated", () => {
  assert.equal(isBlobUploadCompletionBody({ type: "blob.upload-completed" }), true);
  assert.equal(isBlobUploadCompletionBody({ type: "jukebox.finalize" }), false);
  assert.equal(isBlobUploadCompletionBody(null), false);
});

test("signed completion records the exact song, path, and URL without a browser session", async () => {
  const recorded: unknown[] = [];

  const descriptor = await recordCompletedAudioUpload(completed, async (value) => {
    recorded.push(value);
  });

  assert.deepEqual(descriptor, {
    reservationId: "reservation-1",
    songId: "song-1",
    pathname: "jukebox-audio/song-1/upload.mp3",
    audioUrl: completed.blob.url,
  });
  assert.deepEqual(recorded, [descriptor]);
});

test("completion rejects a Blob whose pathname differs from the issued reservation", async () => {
  await assert.rejects(
    () => recordCompletedAudioUpload(
      { ...completed, blob: { ...completed.blob, pathname: "jukebox-audio/song-2/other.mp3" } },
      async () => undefined,
    ),
    /does not match/i,
  );
});

test("expired reservation cleanup discovers and cleans an abandoned completed Blob", async () => {
  const tasks: unknown[] = [];
  const result = await settleExpiredAudioUpload(
    {
      songId: "song-1",
      pathname: completed.blob.pathname,
      audioUrl: completed.blob.url,
    },
    async () => ({ audioUrl: null, audioStoragePath: null }),
    async (task) => {
      tasks.push(task);
      return { status: "queued" };
    },
  );

  assert.deepEqual(result, { status: "cleaned", cleanupStatus: "queued" });
  assert.deepEqual(tasks, [{
    audioUrl: completed.blob.url,
    pathname: completed.blob.pathname,
    reason: "upload_reservation_expired",
  }]);
});

test("expired cleanup never deletes a Blob already attached by an idempotent finalize", async () => {
  let cleanupCalls = 0;
  const result = await settleExpiredAudioUpload(
    {
      songId: "song-1",
      pathname: completed.blob.pathname,
      audioUrl: completed.blob.url,
    },
    async () => ({
      audioUrl: completed.blob.url,
      audioStoragePath: completed.blob.pathname,
    }),
    async () => {
      cleanupCalls += 1;
      return { status: "deleted" };
    },
  );

  assert.deepEqual(result, { status: "attached" });
  assert.equal(cleanupCalls, 0);
});

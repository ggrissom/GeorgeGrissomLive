import assert from "node:assert/strict";
import test from "node:test";
import { BlobNotFoundError } from "@vercel/blob";

import {
  deleteOwnedJukeboxAudio,
  matchesOwnedBlobDescriptor,
} from "./storage";

const audioUrl =
  "https://configured.public.blob.vercel-storage.com/jukebox-audio/song-1/file.mp3";
const pathname = "jukebox-audio/song-1/file.mp3";

test("accepts only the exact URL and persisted pathname returned by the configured store", () => {
  assert.equal(
    matchesOwnedBlobDescriptor(audioUrl, pathname, {
      url: audioUrl,
      pathname,
    }),
    true,
  );
  assert.equal(
    matchesOwnedBlobDescriptor(audioUrl, pathname, {
      url: "https://other.public.blob.vercel-storage.com/jukebox-audio/song-1/file.mp3",
      pathname,
    }),
    false,
  );
  assert.equal(
    matchesOwnedBlobDescriptor(audioUrl, pathname, {
      url: audioUrl,
      pathname: "jukebox-audio/song-2/file.mp3",
    }),
    false,
  );
});

test("rejects legacy URLs without explicit persisted ownership metadata", () => {
  assert.equal(
    matchesOwnedBlobDescriptor(audioUrl, null, {
      url: audioUrl,
      pathname,
    }),
    false,
  );
});

test("treats an exact-store 404 as already cleaned", async () => {
  assert.equal(
    await deleteOwnedJukeboxAudio(audioUrl, pathname, {
      head: async () => {
        throw new BlobNotFoundError();
      },
      del: async () => undefined,
    }),
    true,
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { isOwnedJukeboxAudioUrl } from "./storage";

test("recognizes only HTTPS Vercel Blob objects in this app audio namespace", () => {
  assert.equal(
    isOwnedJukeboxAudioUrl(
      "https://example.public.blob.vercel-storage.com/jukebox-audio/song-1/file.mp3",
    ),
    true,
  );
  for (const url of [
    "http://example.public.blob.vercel-storage.com/jukebox-audio/song-1/file.mp3",
    "https://example.public.blob.vercel-storage.com/recordings/file.mp3",
    "https://example.com/jukebox-audio/song-1/file.mp3",
    "/uploads/audio/file.mp3",
    "not a URL",
  ]) {
    assert.equal(isOwnedJukeboxAudioUrl(url), false, url);
  }
});

test("rejects encoded namespace traversal and credentialed URLs", () => {
  for (const url of [
    "https://example.public.blob.vercel-storage.com/jukebox-audio%2Fsong-1/file.mp3",
    "https://user:pass@example.public.blob.vercel-storage.com/jukebox-audio/song-1/file.mp3",
  ]) {
    assert.equal(isOwnedJukeboxAudioUrl(url), false, url);
  }
});

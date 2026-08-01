import assert from "node:assert/strict";
import test from "node:test";

import {
  AudioUploadPolicyError,
  createAudioTokenPolicy,
  createAudioUploadPath,
  parseAudioClientPayload,
} from "./upload-policy";
import { MAX_AUDIO_BYTES } from "./metadata";

test("creates a song-scoped sanitized Blob pathname", () => {
  assert.equal(
    createAudioUploadPath("song/one", "  My live mix.wav  ", "upload-id"),
    "jukebox-audio/song%2Fone/upload-id-My-live-mix.wav",
  );
});

test("accepts only a nonblank song id client payload", () => {
  assert.deepEqual(parseAudioClientPayload('{"songId":" song-1 "}'), {
    songId: "song-1",
  });
  for (const payload of [null, "", "{}", '{"songId":42}', "not json"]) {
    assert.throws(() => parseAudioClientPayload(payload), AudioUploadPolicyError);
  }
});

test("issues a token policy only for the requested song namespace", () => {
  const pathname = "jukebox-audio/song-1/upload-id-track.mp3";
  assert.deepEqual(createAudioTokenPolicy(pathname, "song-1"), {
    allowedContentTypes: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"],
    maximumSizeInBytes: MAX_AUDIO_BYTES,
    addRandomSuffix: false,
    tokenPayload: JSON.stringify({ songId: "song-1", pathname }),
  });
  for (const invalid of [
    "jukebox-audio/song-2/upload-id-track.mp3",
    "recordings/song-1/track.mp3",
    "jukebox-audio/song-1/../track.mp3",
    "jukebox-audio/song-1/track.exe",
  ]) {
    assert.throws(
      () => createAudioTokenPolicy(invalid, "song-1"),
      AudioUploadPolicyError,
    );
  }
});

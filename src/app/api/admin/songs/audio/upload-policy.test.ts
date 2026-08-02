import assert from "node:assert/strict";
import test from "node:test";

import {
  AudioUploadPolicyError,
  createAudioTokenPolicy,
  createAudioUploadPath,
  parseAudioClientPayload,
  parseAudioTokenPayload,
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

test("issues a token policy tied to the persisted reservation and song namespace", () => {
  const pathname = "jukebox-audio/song-1/upload-id-track.mp3";
  assert.deepEqual(createAudioTokenPolicy(pathname, "song-1", "reservation-1"), {
    allowedContentTypes: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"],
    maximumSizeInBytes: MAX_AUDIO_BYTES,
    addRandomSuffix: false,
    allowOverwrite: false,
    tokenPayload: JSON.stringify({
      reservationId: "reservation-1",
      songId: "song-1",
      pathname,
    }),
  });
  for (const invalid of [
    "jukebox-audio/song-2/upload-id-track.mp3",
    "recordings/song-1/track.mp3",
    "jukebox-audio/song-1/../track.mp3",
    "jukebox-audio/song-1/track.exe",
  ]) {
    assert.throws(
      () => createAudioTokenPolicy(invalid, "song-1", "reservation-1"),
      AudioUploadPolicyError,
    );
  }
});

test("parses only complete server-issued upload tracking payloads", () => {
  const pathname = "jukebox-audio/song-1/upload-id-track.mp3";
  assert.deepEqual(
    parseAudioTokenPayload(JSON.stringify({
      reservationId: " reservation-1 ",
      songId: " song-1 ",
      pathname,
    })),
    { reservationId: "reservation-1", songId: "song-1", pathname },
  );
  for (const payload of [
    null,
    "{}",
    JSON.stringify({ reservationId: "r", songId: "song-1" }),
    JSON.stringify({ reservationId: "", songId: "song-1", pathname }),
  ]) {
    assert.throws(() => parseAudioTokenPayload(payload), AudioUploadPolicyError);
  }
});

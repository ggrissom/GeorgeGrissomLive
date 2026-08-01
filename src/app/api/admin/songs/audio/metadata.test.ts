import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_AUDIO_BYTES,
  AudioUploadValidationError,
  normalizeDuration,
  readAudioDuration,
  readAudioDurationFromStream,
  validateAudioUpload,
} from "./metadata";

function oneSecondWav(): File {
  const sampleCount = 8000;
  const bytes = Buffer.alloc(44 + sampleCount, 128);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(36 + sampleCount, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24);
  bytes.writeUInt32LE(8000, 28);
  bytes.writeUInt16LE(1, 32);
  bytes.writeUInt16LE(8, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(sampleCount, 40);
  return new File([bytes], "one-second.wav", { type: "audio/wav" });
}

test("accepts bounded MP3 and WAV uploads", () => {
  for (const type of ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"]) {
    assert.doesNotThrow(() => validateAudioUpload({ size: 1024, type }));
  }
});

test("rejects executable and text uploads", () => {
  for (const type of ["application/x-msdownload", "text/plain"]) {
    assert.throws(
      () => validateAudioUpload({ size: 1024, type }),
      AudioUploadValidationError,
    );
  }
});

test("rejects empty and oversized audio uploads", () => {
  assert.throws(
    () => validateAudioUpload({ size: 0, type: "audio/mpeg" }),
    AudioUploadValidationError,
  );
  assert.throws(
    () =>
      validateAudioUpload({
        size: MAX_AUDIO_BYTES + 1,
        type: "audio/wav",
      }),
    AudioUploadValidationError,
  );
});

test("normalizes finite durations to whole non-negative seconds", () => {
  assert.equal(normalizeDuration(null), null);
  assert.equal(normalizeDuration(0), 0);
  assert.equal(normalizeDuration(64.6), 65);
});

test("rejects nonfinite and negative durations", () => {
  for (const duration of [Number.NaN, Number.POSITIVE_INFINITY, -0.1]) {
    assert.throws(
      () => normalizeDuration(duration),
      AudioUploadValidationError,
    );
  }
});

test("reads and rounds duration from a bounded WAV file", async () => {
  assert.equal(await readAudioDuration(oneSecondWav()), 1);
});

test("reports unreadable audio metadata with a user-safe validation error", async () => {
  const invalid = new File([Buffer.alloc(128)], "invalid.wav", {
    type: "audio/wav",
  });
  await assert.rejects(readAudioDuration(invalid), AudioUploadValidationError);
});

test("verifies duration from a bounded server-side Blob stream", async () => {
  const wav = oneSecondWav();
  assert.equal(
    await readAudioDurationFromStream(wav.stream(), {
      mimeType: wav.type,
      size: wav.size,
      path: wav.name,
    }),
    1,
  );
});

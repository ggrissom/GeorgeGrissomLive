import test from "node:test";
import assert from "node:assert/strict";
import { wavDownloadHeaders } from "./wav-download-policy";

test("WAV downloads are forced attachments and never cached", () => {
  const headers = wavDownloadHeaders("George Grissom - What a Shame.wav", {
    "content-length": "59900000",
    "accept-ranges": "bytes"
  });
  assert.equal(headers["Content-Type"], "audio/wav");
  assert.equal(headers["Cache-Control"], "private, no-store, max-age=0");
  assert.equal(headers["Accept-Ranges"], "bytes");
  assert.equal(headers["Content-Length"], "59900000");
  assert.match(headers["Content-Disposition"], /^attachment; filename="George Grissom - What a Shame\.wav"$/);
});

test("download filenames cannot inject response headers", () => {
  const headers = wavDownloadHeaders('bad"\r\nX-Evil: yes.wav', {});
  assert.equal(headers["Content-Disposition"].includes("\r"), false);
  assert.equal(headers["Content-Disposition"].includes("\n"), false);
  assert.equal(headers["Content-Disposition"].includes("X-Evil"), false);
});

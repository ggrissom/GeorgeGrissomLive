import assert from "node:assert/strict";
import test from "node:test";
import { hasPersistentUploadStorage, saveUploadFile } from "./files";

test("reports persistent upload storage as disabled when token env is absent", () => {
  const previous = process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  assert.equal(hasPersistentUploadStorage(), false);
  if (previous) process.env.BLOB_READ_WRITE_TOKEN = previous;
});

test("rejects persistent-required uploads when blob storage is not configured", async () => {
  const previous = process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  const file = new File(["test"], "fan-photo.txt", { type: "text/plain" });
  await assert.rejects(
    saveUploadFile(file, "fan-media", { requirePersistent: true }),
    /Persistent upload storage is not configured/
  );
  if (previous) process.env.BLOB_READ_WRITE_TOKEN = previous;
});

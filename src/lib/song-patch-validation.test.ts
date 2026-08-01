import assert from "node:assert/strict";
import test from "node:test";

import {
  SongPatchValidationError,
  assertSongPatchHasChanges,
  validateOptionalBoolean,
  validateSongPatchId,
} from "./song-patch-validation";

test("normalizes a PATCH song id", () => {
  assert.equal(validateSongPatchId("  song-1  "), "song-1");
});

test("rejects a missing, blank, or non-string PATCH song id", () => {
  for (const id of [undefined, null, "", "   ", 42]) {
    assert.throws(() => validateSongPatchId(id), SongPatchValidationError);
  }
});

test("rejects a PATCH without editable song fields", () => {
  assert.throws(() => assertSongPatchHasChanges({}), SongPatchValidationError);
  assert.doesNotThrow(() => assertSongPatchHasChanges({ title: "Updated title" }));
});

test("accepts only real booleans for optional song visibility", () => {
  assert.equal(validateOptionalBoolean(undefined, "isPublic"), undefined);
  assert.equal(validateOptionalBoolean(true, "isPublic"), true);
  assert.equal(validateOptionalBoolean(false, "isPublic"), false);
  for (const value of ["true", "false", 1, 0, null]) {
    assert.throws(
      () => validateOptionalBoolean(value, "isPublic"),
      SongPatchValidationError,
    );
  }
});

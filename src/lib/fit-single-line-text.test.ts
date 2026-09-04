import assert from "node:assert/strict";
import test from "node:test";
import { fitSingleLineFontSize } from "./fit-single-line-text";

test("keeps the maximum size when the complete title already fits", () => {
  assert.equal(fitSingleLineFontSize({ availableWidth: 200, measuredWidth: 180 }), 15);
});

test("scales a long title down proportionally without exceeding the container", () => {
  assert.equal(fitSingleLineFontSize({ availableWidth: 120, measuredWidth: 300 }), 7);
});

test("never shrinks below the readable minimum for an unusually long word", () => {
  assert.equal(fitSingleLineFontSize({ availableWidth: 80, measuredWidth: 1000 }), 7);
});

test("returns the minimum for invalid measurements", () => {
  assert.equal(fitSingleLineFontSize({ availableWidth: 0, measuredWidth: 200 }), 7);
});

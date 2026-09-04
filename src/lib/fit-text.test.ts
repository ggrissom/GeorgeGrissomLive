import test from "node:test";
import assert from "node:assert/strict";
import { calculateFittedFontSize } from "./fit-text";

test("keeps the maximum size when the title already fits", () => {
  assert.equal(calculateFittedFontSize({ availableWidth: 200, measuredWidth: 160, maxFontSize: 15 }), 15);
});

test("shrinks a long title in direct proportion to the available width", () => {
  assert.equal(calculateFittedFontSize({ availableWidth: 120, measuredWidth: 240, maxFontSize: 16 }), 8);
});

test("never returns less than the configured readable floor", () => {
  assert.equal(calculateFittedFontSize({ availableWidth: 10, measuredWidth: 1000, maxFontSize: 16, minFontSize: 2 }), 2);
});

test("falls back to the maximum size when measurements are not usable", () => {
  assert.equal(calculateFittedFontSize({ availableWidth: 0, measuredWidth: 0, maxFontSize: 14 }), 14);
});

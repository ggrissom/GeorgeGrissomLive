import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanupLeaseUntil,
  cleanupRetryState,
} from "./cleanup-retry-policy";

const now = new Date("2026-08-01T12:00:00.000Z");

test("leases claimed cleanup work so concurrent workers cannot immediately reclaim it", () => {
  assert.equal(
    cleanupLeaseUntil(now).toISOString(),
    "2026-08-01T12:05:00.000Z",
  );
});

test("backs failed cleanup jobs off so one poison job cannot starve the queue", () => {
  assert.deepEqual(cleanupRetryState(1, now), {
    nextAttemptAt: new Date("2026-08-01T12:01:00.000Z"),
    terminalAt: null,
  });
  assert.deepEqual(cleanupRetryState(3, now), {
    nextAttemptAt: new Date("2026-08-01T12:04:00.000Z"),
    terminalAt: null,
  });
});

test("marks repeatedly failing cleanup terminal after eight attempts", () => {
  assert.deepEqual(cleanupRetryState(8, now), {
    nextAttemptAt: now,
    terminalAt: now,
  });
});

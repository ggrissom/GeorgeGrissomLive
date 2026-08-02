import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { scripts?: Record<string, string> };

test("production build never mutates the database", () => {
  assert.equal(packageJson.scripts?.build, "prisma generate && next build");
  assert.doesNotMatch(packageJson.scripts?.build ?? "", /db\s+(push|migrate)/);
  assert.doesNotMatch(packageJson.scripts?.build ?? "", /accept-data-loss/);
});

test("production migrations have an explicit deploy command", () => {
  assert.equal(packageJson.scripts?.["db:deploy"], "prisma migrate deploy");
});

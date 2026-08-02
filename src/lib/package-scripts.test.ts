import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

test("Vercel uses only the schema-neutral package build", () => {
  const configUrl = new URL("../../vercel.json", import.meta.url);
  assert.ok(existsSync(configUrl), "vercel.json must define the repository build command");
  const vercelConfig = JSON.parse(
    readFileSync(configUrl, "utf8"),
  ) as Record<string, unknown>;

  assert.deepEqual(Object.keys(vercelConfig).sort(), ["$schema", "buildCommand"]);
  assert.equal(vercelConfig.$schema, "https://openapi.vercel.sh/vercel.json");
  assert.equal(vercelConfig.buildCommand, "npm run build");
  assert.doesNotMatch(String(vercelConfig.buildCommand), /db\s+(push|migrate)/);
  assert.doesNotMatch(String(vercelConfig.buildCommand), /accept-data-loss/);
});

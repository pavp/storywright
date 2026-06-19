import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const BIN = join(REPO, "bin/storywright.mjs");

const { version } = JSON.parse(
  readFileSync(join(REPO, "package.json"), "utf8")
);

for (const flag of ["--version", "-v"]) {
  test(`${flag} prints package.json version and exits 0`, () => {
    const r = spawnSync(process.execPath, [BIN, flag], {
      cwd: REPO,
      encoding: "utf8",
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), version);
  });
}

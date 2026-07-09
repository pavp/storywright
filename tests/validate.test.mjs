import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");

test("validate-skills exits 0 on the current repo", () => {
  const r = spawnSync(
    process.execPath,
    [join(REPO, "scripts/validate-skills.mjs")],
    { cwd: REPO, encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.log("STDOUT:", r.stdout);
    console.log("STDERR:", r.stderr);
  }
  assert.equal(r.status, 0, "validator must pass on the repo's own skills");
});

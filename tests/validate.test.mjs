import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const SKILL_MD = join(REPO, "skills/storywright/SKILL.md");
const REF_DIR = join(REPO, "skills/storywright/references");

function runValidator() {
  return spawnSync(
    process.execPath,
    [join(REPO, "scripts/validate-skills.mjs")],
    { cwd: REPO, encoding: "utf8" }
  );
}

test("validate-skills exits 0 on the current repo", () => {
  const r = runValidator();
  if (r.status !== 0) {
    console.log("STDOUT:", r.stdout);
    console.log("STDERR:", r.stderr);
  }
  assert.equal(r.status, 0, "validator must pass on the repo's own skills");
});

// The three fail-path tests below mutate the real skills/storywright/ tree
// temporarily (validate-skills.mjs hardcodes SKILLS_DIR and has no target-dir
// arg — see scripts/lib/skills.mjs). Each test snapshots the exact original
// content/state before mutating and restores it in a finally block so the
// tree is left byte-identical regardless of test outcome.

test("validate-skills rejects a stale [[link]] in the router SKILL.md body", async () => {
  const original = await readFile(SKILL_MD, "utf8");
  try {
    await writeFile(SKILL_MD, `${original}\n\nSee [[ghost-reference]] for details.\n`);
    const r = runValidator();
    assert.notEqual(r.status, 0, "validator must reject a stale [[link]] in SKILL.md");
    assert.match(
      r.stderr,
      /ghost-reference/,
      "error message must name the unresolved reference"
    );
  } finally {
    await writeFile(SKILL_MD, original);
  }
});

test("validate-skills rejects a stale [[link]] inside a references/*.md body", async () => {
  const refPath = join(REF_DIR, "estimation.md");
  const original = await readFile(refPath, "utf8");
  try {
    await writeFile(refPath, `${original}\n\nSee [[ghost-reference]] for details.\n`);
    const r = runValidator();
    assert.notEqual(
      r.status,
      0,
      "validator must reject a stale [[link]] inside a reference body"
    );
    assert.match(
      r.stderr,
      /ghost-reference/,
      "error message must name the unresolved reference"
    );
  } finally {
    await writeFile(refPath, original);
  }
});

test("validate-skills rejects an orphaned reference file", async () => {
  const orphanPath = join(REF_DIR, "orphan-fixture.md");
  try {
    await writeFile(orphanPath, "## Purpose\n\nUnlinked fixture reference.\n");
    const r = runValidator();
    assert.notEqual(r.status, 0, "validator must reject an orphaned reference file");
    assert.match(r.stderr, /orphaned/, "error message must say 'orphaned'");
    assert.match(r.stderr, /orphan-fixture/, "error message must name the orphaned file");
  } finally {
    await rm(orphanPath, { force: true });
  }
});

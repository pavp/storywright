import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, mkdir, readFile, writeFile, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const SKILL_SRC = join(REPO, "skills/storywright");

function runValidator(targetDir) {
  const args = [join(REPO, "scripts/validate-skills.mjs")];
  if (targetDir) args.push(targetDir);
  return spawnSync(process.execPath, args, { cwd: REPO, encoding: "utf8" });
}

// Fail-path tests below must never mutate the real skills/storywright/ tree:
// tests/skills-shape.test.mjs reads that same tree concurrently (node --test
// runs test files in parallel), so a transient in-place mutation here caused
// an intermittent CI race (shape test read corrupted content mid-mutation).
// Each fail-path test instead copies skills/storywright/ into a fresh temp
// dir, mutates ONLY the copy, and points the validator at that temp dir via
// its optional target-dir argv[2] (scripts/validate-skills.mjs).
async function makeTempSkillCopy() {
  const tempRoot = await mkdtemp(join(tmpdir(), "storywright-validate-"));
  const tempSkillsDir = join(tempRoot, "skills");
  const tempSkillDir = join(tempSkillsDir, "storywright");
  await mkdir(tempSkillsDir, { recursive: true });
  await cp(SKILL_SRC, tempSkillDir, { recursive: true });
  return { tempRoot, tempSkillsDir, tempSkillDir };
}

test("validate-skills exits 0 on the current repo", () => {
  const r = runValidator();
  if (r.status !== 0) {
    console.log("STDOUT:", r.stdout);
    console.log("STDERR:", r.stderr);
  }
  assert.equal(r.status, 0, "validator must pass on the repo's own skills");
});

test("validate-skills rejects a stale [[link]] in the router SKILL.md body", async () => {
  let tempRoot;
  try {
    let tempSkillsDir, tempSkillDir;
    ({ tempRoot, tempSkillsDir, tempSkillDir } = await makeTempSkillCopy());
    const skillMd = join(tempSkillDir, "SKILL.md");
    const original = await readFile(skillMd, "utf8");
    await writeFile(skillMd, `${original}\n\nSee [[ghost-reference]] for details.\n`);
    const r = runValidator(tempSkillsDir);
    assert.notEqual(r.status, 0, "validator must reject a stale [[link]] in SKILL.md");
    assert.match(
      r.stderr,
      /ghost-reference/,
      "error message must name the unresolved reference"
    );
  } finally {
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  }
});

test("validate-skills rejects a stale [[link]] inside a references/*.md body", async () => {
  let tempRoot;
  try {
    let tempSkillsDir, tempSkillDir;
    ({ tempRoot, tempSkillsDir, tempSkillDir } = await makeTempSkillCopy());
    const refPath = join(tempSkillDir, "references", "estimation.md");
    const original = await readFile(refPath, "utf8");
    await writeFile(refPath, `${original}\n\nSee [[ghost-reference]] for details.\n`);
    const r = runValidator(tempSkillsDir);
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
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  }
});

test("validate-skills rejects an orphaned reference file", async () => {
  let tempRoot;
  try {
    let tempSkillsDir, tempSkillDir;
    ({ tempRoot, tempSkillsDir, tempSkillDir } = await makeTempSkillCopy());
    const orphanPath = join(tempSkillDir, "references", "orphan-fixture.md");
    await writeFile(orphanPath, "## Purpose\n\nUnlinked fixture reference.\n");
    const r = runValidator(tempSkillsDir);
    assert.notEqual(r.status, 0, "validator must reject an orphaned reference file");
    assert.match(r.stderr, /orphaned/, "error message must say 'orphaned'");
    assert.match(r.stderr, /orphan-fixture/, "error message must name the orphaned file");
  } finally {
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");

const { findSkillFiles, loadSkill } = await import(
  join(REPO, "scripts/lib/skills.mjs")
);

test("all top-level skills compose at least one component", async () => {
  const files = await findSkillFiles();
  const topLevel = [];
  for (const f of files) {
    const s = await loadSkill(f);
    if (!s.relPath.includes("_components/")) topLevel.push(s);
  }
  for (const s of topLevel) {
    const composes = Array.isArray(s.frontmatter.composes)
      ? s.frontmatter.composes
      : [];
    assert.ok(
      composes.length > 0,
      `top-level skill '${s.frontmatter.name}' should compose ≥1 component`
    );
  }
});

test("every skill has a kebab-case name matching its folder", async () => {
  const files = await findSkillFiles();
  for (const f of files) {
    const s = await loadSkill(f);
    const folder = f.split("/").slice(-2, -1)[0];
    assert.equal(
      s.frontmatter.name,
      folder,
      `frontmatter name should match folder for ${s.relPath}`
    );
  }
});

test("every skill declares inputs and outputs", async () => {
  const files = await findSkillFiles();
  for (const f of files) {
    const s = await loadSkill(f);
    assert.ok(
      Array.isArray(s.frontmatter.inputs) && s.frontmatter.inputs.length > 0,
      `${s.relPath}: 'inputs' frontmatter should be a non-empty list`
    );
    assert.ok(
      Array.isArray(s.frontmatter.outputs) && s.frontmatter.outputs.length > 0,
      `${s.relPath}: 'outputs' frontmatter should be a non-empty list`
    );
  }
});

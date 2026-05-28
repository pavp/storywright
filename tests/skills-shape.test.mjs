import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

// P1.2 — every story-producing top-level skill must declare the full 3-file
// trio (standard + jira-wiki + dev). Children/flows use a `story-<N>.` prefix;
// epic.md / flow-summary.md / context are exempt. Catches output-contract drift
// (e.g. a skill stuck on 2-file output).
test("all story-producing skills declare the standard/jira-wiki/dev trio", async () => {
  const files = await findSkillFiles();
  const SUFFIXES = ["standard.md", "jira-wiki.md", "dev.md"];
  for (const f of files) {
    const s = await loadSkill(f);
    if (s.relPath.includes("_components/")) continue;
    const outputs = Array.isArray(s.frontmatter.outputs) ? s.frontmatter.outputs : [];
    const storyOutputs = outputs.filter((o) => /\.(standard|jira-wiki|dev)\.md$/.test(o));
    for (const suffix of SUFFIXES) {
      assert.ok(
        storyOutputs.some((o) => o.endsWith(suffix)),
        `${s.relPath}: outputs must include a *.${suffix} file (3-file parity)`
      );
    }
  }
});

// P2.1 — committed golden PM files must stay free of technical leakage
// (rule 3): no command-level DoD, no obvious file paths / imports. The dev
// file is exempt. Guards the PM↔dev separation against future regressions.
test("golden PM outputs carry no technical leakage", async () => {
  const dir = join(REPO, "examples/outputs/google-login");
  const LEAK = [
    /npm run /,
    /\bimport\b/,
    /\.(mjs|ts|tsx|jsx)\b/,
    /### Edge Cases/,
    /## Edge Cases/,
  ];
  for (const pm of ["story.standard.md", "story.jira-wiki.md"]) {
    const text = await readFile(join(dir, pm), "utf8");
    for (const re of LEAK) {
      assert.ok(!re.test(text), `${pm} leaks technical detail matching ${re}`);
    }
  }
  // The dev file SHOULD contain the technical detail.
  const dev = await readFile(join(dir, "story.dev.md"), "utf8");
  assert.match(dev, /npm run /, "story.dev.md should contain command-level DoD");
});

// P1.3 — the marketplace manifest must list exactly the skills on disk.
// Catches a stale/incomplete plugin.json (e.g. storywright-base missing).
test("plugin.json skills match the skills on disk", async () => {
  const manifest = JSON.parse(
    await readFile(join(REPO, ".claude-plugin/plugin.json"), "utf8")
  );
  const listed = new Set(manifest.skills);

  const onDisk = new Set();
  for (const f of await findSkillFiles()) {
    const dir = dirname(f);
    onDisk.add(dir.slice(REPO.length + 1)); // path relative to repo root
  }

  for (const p of onDisk) {
    assert.ok(listed.has(p), `plugin.json missing skill on disk: ${p}`);
  }
  for (const p of listed) {
    assert.ok(onDisk.has(p), `plugin.json lists a skill not on disk: ${p}`);
  }
});

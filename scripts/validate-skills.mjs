#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { findSkillFiles, loadSkill } from "./lib/skills.mjs";

const REQUIRED_FM = ["name", "description", "trigger", "intent", "version"];
const REQUIRED_SECTIONS = ["## Purpose", "## Application"];
const KEBAB_RE = /^[a-z][a-z0-9-]*$/;

// install-unit-shape PR2 (ADR-4): composes:/component-orphan checks are
// replaced by reference-link integrity, scoped to the single skill's own
// references/ directory. See design.md "Validator redesign" + spec
// story-composition:70-97 and install-unit-shape:120-148.
async function checkReferenceLinks(skill, errors) {
  const skillDir = dirname(skill.path);
  const refDir = join(skillDir, "references");
  let refEntries;
  try {
    refEntries = await readdir(refDir, { withFileTypes: true });
  } catch {
    // No references/ dir for this skill — nothing to check.
    return;
  }
  const refFiles = new Set(
    refEntries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => basename(e.name, ".md"))
  );

  // Scan the SKILL.md body AND every references/*.md body (spec requires
  // catching a stale link left inside a reference file, not only in
  // SKILL.md — install-unit-shape scenario "fails on a stale inter-skill
  // link inside a reference body").
  const ROOT = Symbol("root");
  const bodies = [{ label: skill.relPath, node: ROOT, text: skill.body }];
  for (const name of refFiles) {
    const refPath = join(refDir, `${name}.md`);
    const text = await readFile(refPath, "utf8");
    bodies.push({ label: `skills/${basename(skillDir)}/references/${name}.md`, node: name, text });
  }

  // Build a directed link graph: edge X -> Y when body X contains a link to
  // reference Y. The root node (SKILL.md body) is the traversal start.
  // Reachability from the root — not flat "is it linked by anything" —
  // is what actually proves a reference is wired into the skill: a
  // self-link (A -> A) or a mutual-only pair (A -> B -> A) forms a cycle
  // that is never reachable from ROOT, so both cases correctly stay
  // unreachable and get flagged as orphaned, while a legitimate transitive
  // chain (SKILL.md -> A -> B) still marks B reachable.
  const graph = new Map();
  const LINK_RES = [/\[\[([a-z0-9-]+)\]\]/g, /references\/([a-z0-9-]+)\.md/g];
  for (const { label, node, text } of bodies) {
    let edges = graph.get(node);
    if (!edges) {
      edges = new Set();
      graph.set(node, edges);
    }
    for (const re of LINK_RES) {
      for (const m of text.matchAll(re)) {
        const name = m[1];
        edges.add(name);
        if (!refFiles.has(name)) {
          errors.push(`${label}: link to 'references/${name}.md' does not resolve — no such reference file`);
        }
      }
    }
  }

  // BFS from ROOT to find every reference actually reachable from SKILL.md.
  const reachable = new Set();
  const queue = [ROOT];
  while (queue.length) {
    const current = queue.shift();
    for (const next of graph.get(current) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  // Orphan check: every reference file must be reachable from SKILL.md,
  // directly or transitively — merely being mentioned by another
  // unreachable body (itself included) doesn't count.
  for (const name of refFiles) {
    if (!reachable.has(name)) {
      errors.push(`skills/${basename(skillDir)}/references/${name}.md: orphaned — unreachable from SKILL.md`);
    }
  }

  return refFiles.size;
}

async function main() {
  const targetDir = process.argv[2];
  const files = await findSkillFiles(targetDir);
  if (files.length === 0) {
    console.error("✗ No SKILL.md files found under skills/");
    process.exit(1);
  }

  const errors = [];
  const skillNames = new Set();
  let refCount = 0;

  for (const f of files) {
    const skill = await loadSkill(f);
    const rel = skill.relPath;
    const fm = skill.frontmatter;

    for (const key of REQUIRED_FM) {
      if (!fm[key] || (Array.isArray(fm[key]) && fm[key].length === 0)) {
        errors.push(`${rel}: missing required frontmatter '${key}'`);
      }
    }

    if (fm.name) {
      if (!KEBAB_RE.test(fm.name)) {
        errors.push(`${rel}: name '${fm.name}' must be kebab-case`);
      }
      if (fm.name.length > 64) {
        errors.push(`${rel}: name length ${fm.name.length} > 64`);
      }
      if (skillNames.has(fm.name)) {
        errors.push(`${rel}: duplicate skill name '${fm.name}'`);
      } else {
        skillNames.add(fm.name);
      }
      const folderName = basename(dirname(f));
      if (fm.name !== folderName) {
        errors.push(`${rel}: frontmatter name '${fm.name}' must match folder name '${folderName}'`);
      }
    }

    if (fm.description && fm.description.length > 200) {
      errors.push(`${rel}: description length ${fm.description.length} > 200`);
    }

    for (const section of REQUIRED_SECTIONS) {
      if (!skill.body.includes(section)) {
        errors.push(`${rel}: missing required section '${section}'`);
      }
    }

    const n = await checkReferenceLinks(skill, errors);
    if (n) refCount += n;
  }

  if (errors.length) {
    console.error(`✗ Validation failed (${errors.length} error${errors.length === 1 ? "" : "s"}):\n`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`✓ ${files.length} skill${files.length === 1 ? "" : "s"} validated (${refCount} reference${refCount === 1 ? "" : "s"} linked)`);
}

main().catch((err) => {
  console.error("✗ Validator crashed:", err);
  process.exit(2);
});

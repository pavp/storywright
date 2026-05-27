#!/usr/bin/env node
import { join, dirname, basename } from "node:path";
import { findSkillFiles, loadSkill, pathExists, SKILLS_DIR, REPO_ROOT } from "./lib/skills.mjs";

const REQUIRED_FM = ["name", "description", "trigger", "intent", "version"];
const REQUIRED_SECTIONS = ["## Purpose", "## Application"];
const KEBAB_RE = /^[a-z][a-z0-9-]*$/;

async function main() {
  const files = await findSkillFiles();
  if (files.length === 0) {
    console.error("✗ No SKILL.md files found under skills/");
    process.exit(1);
  }

  const errors = [];
  const skillNames = new Set();
  const componentPaths = new Set();

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
    }

    if (fm.description && fm.description.length > 200) {
      errors.push(`${rel}: description length ${fm.description.length} > 200`);
    }

    for (const section of REQUIRED_SECTIONS) {
      if (!skill.body.includes(section)) {
        errors.push(`${rel}: missing required section '${section}'`);
      }
    }

    if (rel.includes("skills/_components/")) {
      componentPaths.add(`_components/${basename(dirname(f))}`);
    }
  }

  for (const f of files) {
    const skill = await loadSkill(f);
    const composes = Array.isArray(skill.frontmatter.composes) ? skill.frontmatter.composes : [];
    for (const dep of composes) {
      if (!componentPaths.has(dep)) {
        errors.push(`${skill.relPath}: composes references missing component '${dep}'`);
      }
    }
  }

  if (errors.length) {
    console.error(`✗ Validation failed (${errors.length} error${errors.length === 1 ? "" : "s"}):\n`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`✓ ${files.length} skills validated (${componentPaths.size} components, ${files.length - componentPaths.size} top-level)`);
}

main().catch((err) => {
  console.error("✗ Validator crashed:", err);
  process.exit(2);
});

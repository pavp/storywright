#!/usr/bin/env node
import { homedir } from "node:os";
import { join, relative } from "node:path";
import { findSkillFiles, loadSkill, pathExists, SKILLS_DIR } from "./lib/skills.mjs";

const installed = join(homedir(), ".claude", "skills", "storywright");

async function main() {
  const repoFiles = await findSkillFiles(SKILLS_DIR);
  const installedExists = await pathExists(installed);

  const tops = [];
  const components = [];
  for (const f of repoFiles) {
    const skill = await loadSkill(f);
    const entry = {
      name: skill.frontmatter.name ?? "(unnamed)",
      desc: skill.frontmatter.description ?? "",
      path: relative(SKILLS_DIR, f),
    };
    if (skill.relPath.includes("_components/")) components.push(entry);
    else tops.push(entry);
  }

  console.log(`Repo skills (${repoFiles.length} total)`);
  console.log(`Installed at ~/.claude/skills/storywright/: ${installedExists ? "YES" : "NO"}\n`);

  console.log(`Top-level skills (${tops.length}):`);
  for (const s of tops) console.log(`  • ${s.name.padEnd(22)} — ${s.desc.slice(0, 80)}`);

  console.log(`\nComponent skills (${components.length}):`);
  for (const s of components) console.log(`  · ${s.name.padEnd(28)} — ${s.desc.slice(0, 70)}`);
}

main().catch((err) => {
  console.error("✗ List failed:", err);
  process.exit(1);
});

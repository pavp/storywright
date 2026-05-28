#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, SKILLS_DIR, pathExists } from "./lib/skills.mjs";

const skillName = process.argv[2];
if (!skillName) {
  console.error("Usage: storywright zip <skill-name>");
  console.error("Example: storywright zip story-generate");
  process.exit(1);
}

function hasZip() {
  const probe = spawnSync("zip", ["-v"], { stdio: "ignore" });
  return !probe.error;
}

async function resolveSourceDir() {
  const topDir = join(SKILLS_DIR, skillName);
  if (await pathExists(topDir)) return topDir;
  const compDir = join(SKILLS_DIR, "_components", skillName);
  if (await pathExists(compDir)) return compDir;
  return null;
}

async function main() {
  const sourceDir = await resolveSourceDir();
  if (!sourceDir) {
    console.error(`✗ Skill not found: ${skillName}`);
    process.exit(1);
  }
  if (!(await pathExists(join(sourceDir, "SKILL.md")))) {
    console.error(`✗ ${skillName} has no SKILL.md — refusing to zip an invalid skill`);
    process.exit(1);
  }
  if (!hasZip()) {
    console.error("✗ `zip` not found on PATH. Install it (e.g. `brew install zip` / `apt-get install zip`) and retry.");
    process.exit(127);
  }

  const outDir = join(REPO_ROOT, "dist");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const outFile = join(outDir, `${skillName}.zip`);
  const result = spawnSync("zip", ["-r", outFile, "."], { cwd: sourceDir, stdio: "inherit" });

  if (result.status !== 0) {
    console.error(`✗ zip exited with status ${result.status}`);
    process.exit(result.status ?? 1);
  }
  console.log(`✓ Wrote ${outFile}`);
}

main().catch((err) => {
  console.error("✗ Zip failed:", err);
  process.exit(1);
});

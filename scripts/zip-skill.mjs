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

async function main() {
  const skillDir = join(SKILLS_DIR, skillName);
  if (!(await pathExists(skillDir))) {
    const compDir = join(SKILLS_DIR, "_components", skillName);
    if (!(await pathExists(compDir))) {
      console.error(`✗ Skill not found: ${skillName}`);
      process.exit(1);
    }
  }
  const sourceDir = (await pathExists(skillDir)) ? skillDir : join(SKILLS_DIR, "_components", skillName);
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

#!/usr/bin/env node
import { homedir } from "node:os";
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { SKILLS_DIR, pathExists } from "./lib/skills.mjs";

const target = join(homedir(), ".claude", "skills", "storywright");

async function main() {
  if (await pathExists(target)) {
    await rm(target, { recursive: true, force: true });
    console.log(`• Removed existing ${target}`);
  }
  await mkdir(target, { recursive: true });
  await cp(SKILLS_DIR, target, { recursive: true });
  console.log(`✓ Installed skills to ${target}`);
  console.log(`  Restart Claude Code (or reload) for skills to be picked up.`);
}

main().catch((err) => {
  console.error("✗ Install failed:", err);
  process.exit(1);
});

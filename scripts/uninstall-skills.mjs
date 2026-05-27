#!/usr/bin/env node
import { homedir } from "node:os";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { pathExists } from "./lib/skills.mjs";

const target = join(homedir(), ".claude", "skills", "storywright");

async function main() {
  if (!(await pathExists(target))) {
    console.log(`• Nothing to uninstall (${target} does not exist)`);
    return;
  }
  await rm(target, { recursive: true, force: true });
  console.log(`✓ Removed ${target}`);
}

main().catch((err) => {
  console.error("✗ Uninstall failed:", err);
  process.exit(1);
});

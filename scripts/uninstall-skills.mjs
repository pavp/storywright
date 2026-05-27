#!/usr/bin/env node
import { homedir } from "node:os";
import { readdir, rm, unlink } from "node:fs/promises";
import { join } from "node:path";
import { pathExists } from "./lib/skills.mjs";

const skillsTarget = join(homedir(), ".claude", "skills", "storywright");
const commandsDir = join(homedir(), ".claude", "commands");
const COMMAND_PREFIX = "storywright-";

async function main() {
  let removed = 0;

  if (await pathExists(skillsTarget)) {
    await rm(skillsTarget, { recursive: true, force: true });
    console.log(`✓ Removed ${skillsTarget}`);
    removed++;
  }

  if (await pathExists(commandsDir)) {
    const files = await readdir(commandsDir);
    let cmdsRemoved = 0;
    for (const f of files) {
      if (f.startsWith(COMMAND_PREFIX)) {
        await unlink(join(commandsDir, f));
        cmdsRemoved++;
      }
    }
    if (cmdsRemoved > 0) {
      console.log(`✓ Removed ${cmdsRemoved} slash commands from ${commandsDir}`);
      removed++;
    }
  }

  if (removed === 0) console.log("• Nothing to uninstall.");
}

main().catch((err) => {
  console.error("✗ Uninstall failed:", err);
  process.exit(1);
});

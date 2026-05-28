#!/usr/bin/env node
import { homedir } from "node:os";
import { cp, mkdir, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { REPO_ROOT, SKILLS_DIR, pathExists } from "./lib/skills.mjs";

const skillsTarget = join(homedir(), ".claude", "skills", "storywright");
const commandsDir = join(homedir(), ".claude", "commands");
const commandsSource = join(REPO_ROOT, "commands");
const COMMAND_PREFIX = "storywright-";

async function installSkills() {
  if (await pathExists(skillsTarget)) {
    await rm(skillsTarget, { recursive: true, force: true });
    console.log(`• Removed existing ${skillsTarget}`);
  }
  await mkdir(skillsTarget, { recursive: true });
  await cp(SKILLS_DIR, skillsTarget, { recursive: true });
  console.log(`✓ Installed skills to ${skillsTarget}`);
}

async function installCommands() {
  if (!(await pathExists(commandsSource))) {
    console.log("• No commands/ folder in source; skipping slash command install.");
    return;
  }
  await mkdir(commandsDir, { recursive: true });

  // Remove old storywright-* commands so renames don't leave orphans.
  const existing = await readdir(commandsDir).catch(() => []);
  for (const f of existing) {
    if (f.startsWith(COMMAND_PREFIX)) await unlink(join(commandsDir, f));
  }

  const sources = await readdir(commandsSource);
  for (const f of sources) {
    if (!f.endsWith(".md")) continue;
    await cp(join(commandsSource, f), join(commandsDir, `${COMMAND_PREFIX}${f}`));
  }
  console.log(`✓ Installed slash commands to ${commandsDir} (prefix: ${COMMAND_PREFIX})`);
}

async function ensureGlobalGitignore() {
  let globalIgnorePath;
  try {
    globalIgnorePath = execSync("git config --global core.excludesFile", { encoding: "utf8" }).trim();
  } catch {
    globalIgnorePath = join(homedir(), ".gitignore_global");
    execSync(`git config --global core.excludesFile "${globalIgnorePath}"`);
  }
  if (globalIgnorePath.startsWith("~")) {
    globalIgnorePath = join(homedir(), globalIgnorePath.slice(2));
  }

  let content = "";
  try { content = await readFile(globalIgnorePath, "utf8"); } catch { /* doesn't exist yet */ }

  const entry = "docs/storywright/";
  if (content.includes(entry)) {
    console.log(`• Global gitignore already has ${entry}`);
    return;
  }

  await writeFile(globalIgnorePath, content + `\n# storywright output\n${entry}\n`, "utf8");
  console.log(`✓ Added ${entry} to ${globalIgnorePath}`);
}

async function main() {
  await ensureGlobalGitignore();
  await installSkills();
  await installCommands();
  console.log(`  Restart Claude Code for changes to be picked up.`);
  console.log(`  After restart, try: /storywright-story-generate <your prompt>`);
}

main().catch((err) => {
  console.error("✗ Install failed:", err);
  process.exit(1);
});

#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import pkg from "../package.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = resolve(__dirname, "..", "scripts");

const [, , cmd, ...rest] = process.argv;

const COMMANDS = {
  install: "install-skills.mjs",
  uninstall: "uninstall-skills.mjs",
  list: "list-skills.mjs",
  zip: "zip-skill.mjs",
  validate: "validate-skills.mjs",
};

function usage(exit = 0) {
  console.log(`storywright — PM skills for Claude Code

Usage:
  storywright install              Copy skills to ~/.claude/skills/storywright/
  storywright uninstall            Remove skills from ~/.claude/skills/
  storywright list                 Show available + installed skills
  storywright zip <skill-name>     Build a ZIP for Claude.ai upload
  storywright validate             Lint skill files (frontmatter + structure)
  storywright --version            Print the installed version

Repo: https://github.com/pavp/storywright`);
  process.exit(exit);
}

if (cmd === "--version" || cmd === "-v") {
  console.log(pkg.version);
  process.exit(0);
}
if (!cmd || cmd === "--help" || cmd === "-h") usage(0);
if (!COMMANDS[cmd]) {
  console.error(`Unknown command: ${cmd}\n`);
  usage(1);
}

const script = resolve(scriptsDir, COMMANDS[cmd]);
const child = spawn(process.execPath, [script, ...rest], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));

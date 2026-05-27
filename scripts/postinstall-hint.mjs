#!/usr/bin/env node
// Skip noise in CI and in nested installs.
if (process.env.CI || process.env.npm_config_global !== "true") process.exit(0);

console.log(`
┌─────────────────────────────────────────────────────────────┐
│  storywright installed                                      │
│  Run:  storywright install                                  │
│  to copy the skills into ~/.claude/skills/storywright/      │
│  Then restart Claude Code to pick them up.                  │
└─────────────────────────────────────────────────────────────┘
`);

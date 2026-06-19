#!/usr/bin/env node
// Write a version into the Claude marketplace manifest (.claude-plugin/plugin.json).
//
// semantic-release owns the version number in package.json (@semantic-release/npm
// bumps it in-place). plugin.json is a separate file no release plugin touches, so
// without this step the manifest drifts behind every release. Wired as the
// @semantic-release/exec prepareCmd, it runs after the version is computed and
// before @semantic-release/git commits the bump, keeping both files in lockstep.
//
// Usage: node scripts/sync-plugin-version.mjs <version>
//   <version> defaults to package.json's version when omitted, so the script is
//   also usable manually to repair drift outside a release.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, ".claude-plugin", "plugin.json");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const version = process.argv[2] ?? (await readJson(join(root, "package.json"))).version;

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`✗ Refusing to write an invalid semver into plugin.json: "${version}"`);
  process.exit(1);
}

const raw = await readFile(manifestPath, "utf8");

const versionLine = /("version"\s*:\s*")([^"]*)(")/;
const match = raw.match(versionLine);
if (!match) {
  console.error(`✗ Could not find a "version" field in ${manifestPath}`);
  process.exit(1);
}

const previous = match[2];
if (previous === version) {
  console.log(`✓ plugin.json already at ${version} — no change`);
  process.exit(0);
}

// Surgical replace of only the version value — preserves the file's existing
// formatting (indentation, array style) so releases don't churn unrelated lines.
const updated = raw.replace(versionLine, `$1${version}$3`);
await writeFile(manifestPath, updated);
console.log(`✓ plugin.json version ${previous} → ${version}`);

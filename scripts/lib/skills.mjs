import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, "..", "..");
export const SKILLS_DIR = join(REPO_ROOT, "skills");

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

export function parseFrontmatter(raw) {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { frontmatter: null, body: raw };
  const fmText = match[1];
  const body = match[2];
  const fm = parseSimpleYaml(fmText);
  return { frontmatter: fm, body };
}

function parseSimpleYaml(text) {
  const out = {};
  let currentList = null;
  let currentKey = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim()) continue;
    if (line.startsWith("  - ") || line.startsWith("- ")) {
      const value = line.replace(/^\s*-\s*/, "").trim();
      if (currentList) currentList.push(stripQuotes(value));
      continue;
    }
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const rest = m[2];
    if (rest === "" || rest == null) {
      out[key] = [];
      currentList = out[key];
      currentKey = key;
    } else {
      out[key] = stripQuotes(rest);
      currentList = null;
      currentKey = key;
    }
  }
  return out;
}

function stripQuotes(v) {
  if (typeof v !== "string") return v;
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

export async function findSkillFiles(root = SKILLS_DIR) {
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile() && e.name === "SKILL.md") {
        out.push(full);
      }
    }
  }
  await walk(root);
  return out;
}

export async function loadSkill(skillFilePath) {
  const raw = await readFile(skillFilePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  return {
    path: skillFilePath,
    relPath: relative(REPO_ROOT, skillFilePath),
    raw,
    frontmatter: frontmatter ?? {},
    body,
  };
}

export async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

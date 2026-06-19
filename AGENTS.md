# storywright — dogfood guide

Tells coding agents (Claude Code and any AGENTS.md-aware tool) how to behave when invoked in this repo.

## Repo type

Skills pack for Claude Code. Markdown-driven. The npm package is a thin installer; no runtime, no LLM calls in code — all behavior lives in the Markdown skills.

Two invariants govern everything the skills produce; internalize them before editing any skill:

- **Two-file output (PM↔dev split).** Every story renders as `story.standard.md` (PM-facing — no technical detail) + `story.dev.md` (dev-facing — full detail). Never leak technical content into the PM file.
- **Project-less.** Stories are inferred from the prompt/image/Figma input, never grounded in the open repo (see convention 7 below).

> **Canonical context:** for architecture, the AI/agent model, story-generation internals, and the glossary, read [`docs/storywright-master-context.md`](docs/storywright-master-context.md) first.

## Layout

```
storywright/
├── skills/                   ← knowledge (Markdown w/ YAML frontmatter)
│   ├── story-generate/
│   ├── story-refine/
│   ├── story-split/
│   ├── story-from-figma/
│   └── _components/          ← 11 components composed by top-level skills
├── commands/                 ← slash-command entrypoints for ~/.claude/commands/
├── bin/storywright.mjs       ← CLI
├── scripts/                  ← install / uninstall / validate / zip / list
├── .claude-plugin/           ← Claude marketplace manifest
└── .github/workflows/        ← CI + release pipeline
```

## When working in this repo

1. **Adding / editing a skill**
   Edit the `.md` in `skills/<name>/` or `skills/_components/<name>/`. Keep frontmatter complete: `name`, `description` (≤200 chars), `trigger`, `intent`, `version`, `inputs`, `outputs`. Top-level skills must also list `composes:` referencing existing components. Run `npm run validate` before committing.

2. **Adding / editing a slash command**
   Create or edit `commands/<name>.md` with frontmatter `description` + `argument-hint`, body calling out to the corresponding skill. The CLI installs each as `storywright-<name>.md` under `~/.claude/commands/` (prefix avoids collisions).

3. **Composition is enforced.** Validator (`scripts/validate-skills.mjs`) fails if `composes:` references a non-existent component **or if any component is orphaned** (referenced by no skill via `composes:` or a body `[[link]]`). All five top-level skills compose the same 11 components. The five enrichment components (`business-rules`, `edge-cases`, `analytics-events`, `risks-and-dependencies`, `definition-of-done`) feed `story.dev.md` per `storywright-base` rule 3 — never the PM body (except Business Rules, an optional PM section). The `estimation` component runs after INVEST and feeds `## Estimate` into `story.dev.md` only.

4. **Output language.** Skills must respond in the input language. Don't force English. Detect Spanish / English / other from the user message.

5. **Never auto-split a story.** Splitting always waits for user approval via inline `AskUserQuestion` — never auto-splits silently. Pre-split INVEST gates also apply (V FAIL → not a story; T/N FAIL → refine; E unknowns → spike; I/E/S FAIL → split).

6. **Multi-source inputs are first-class.** When user passes text + image + Figma simultaneously, follow the source-priority matrix in `skills/story-generate/SKILL.md` ("Mixed inputs" section). Surface conflicts as BLOCKING clarifications, never silently pick a winner.

7. **Project-less — never ground stories in the open repo.** storywright generates a forward contract, not a code analysis. When generating or refining a story, do NOT read, scan, or infer from the files of whatever repository is open in the session — even if they look relevant. All technical detail in `story.dev.md` is domain-knowledge inference, marked `⚠️ Assumed:`, never scraped from a codebase. This is `storywright-base` hard rule 14; grounding silently makes output non-deterministic and gives false confidence. (Editing the pack's OWN source — skills, scripts, tests — is normal repo work and unaffected; this rule is about the *generated stories*, not your edits.)

8. **Clean room.** Do not copy content from `deanpeters/Product-Manager-Skills` (CC BY-NC-SA — incompatible with our MIT). Inspired-by only: frontmatter shape, body skeleton, INVEST + Humanizing Work pattern catalog. All prose, taxonomy, and templates are this repo's own.

## Skills surface

The 5 top-level skills:

| Skill | When | Slash command |
|---|---|---|
| `story-generate` | Ambiguous prompt / screenshot / Figma → full story | `/storywright-story-generate` |
| `story-refine` | Existing story → audit + fill gaps in place | `/storywright-story-refine` |
| `story-split` | Oversize story → INVEST-driven epic + children | `/storywright-story-split` |
| `story-from-figma` | Figma URL → one story per flow | `/storywright-story-from-figma` |
| `story-batch` | Multi-item backlog → one story per item in a single pass | `/storywright-story-batch` |

The 11 components (composed by top-level skills). All 5 top-level skills compose all 11:
- `storywright-base` — shared rulebook (hard rules, canonical shape, PM↔dev split, mechanical pre-split/deps, language detect). Every top-level skill inherits this.
- `clarification-questions` — minimum critical questions across 9 axes (including multi-source conflicts)
- `acceptance-criteria` — Given/When/Then ACs; splitting signal on multiple When/Then
- `invest-checklist` — INVEST self-check with verdict mapping to next action
- `definition-of-done` — DoD baseline; acceptance-only projection in PM files, full command-level DoD in `story.dev.md`
- `business-rules` — policy invariants; optional PM section + mirrored in `story.dev.md`
- `edge-cases` — 8 technical failure axes → `story.dev.md` only (rule 3a; never the PM body)
- `analytics-events` — funnel events + payload taxonomy with PII boundary → `story.dev.md` only
- `risks-and-dependencies` — risks + deps with owner+status → `story.dev.md` only
- `story-formatter` — renders the 2-file duo (PM standard + dev)
- `estimation` — Fibonacci story-point estimate from 6 weighted signals; runs after INVEST; `## Estimate` in `story.dev.md` only

## Repo conventions

- **Branch + PR always.** Never commit directly to `main`. All work goes on a new branch and lands via PR (CI must pass). `main` is protected and is the release trigger — direct commits are forbidden.
- **PR body must follow the repo template.** If the repo has a PR template (`.github/PULL_REQUEST_TEMPLATE.md`), the PR body MUST follow its structure — every section and checklist it defines. Do not substitute a free-form body. Fill each section; leave human-only checks (e.g. "manually invoked the skill") unchecked for the author to confirm.
- **Conventional Commits required.** commitlint via husky. `feat:` / `fix:` / `docs:` / `refactor:` / `perf:` / `build:` trigger releases. `chore:` / `ci:` / `test:` / `style:` don't.
- **Never add `Co-authored-by` trailers or AI attribution to commits.** No `Co-authored-by:` lines, no `Co-Authored-By: Claude`, no agent/tool attribution in commit messages or PR bodies. Commits carry the author's own identity only — never a secondary email (work account, bot, or agent).
- **Node 22+** in CI; Node 20+ minimum for scripts.
- **Pure ESM** (`"type": "module"` + `.mjs`). No CommonJS.
- **No build step.** Scripts are runnable directly via `node`.
- **No LLM in code.** All AI behavior lives in the Markdown skills.
- **Dual output mandatory.** Every story-producing skill emits two files per story: `story.standard.md` (PM-facing, no technical detail) + `story.dev.md` (dev-facing, full technical detail). This includes children produced by `story-split` (one pair per child; `epic.md` is the single exception — epic metadata, not a story). Core PM sections always; optional PM sections only when populated; technical detail (edge cases, risks, analytics, command-level DoD) lives in `story.dev.md` only.

## Validation

```bash
npm run validate    # frontmatter + structure linter (scripts/validate-skills.mjs)
npm test            # snapshot + shape tests (tests/*.test.mjs)
```

Both run in CI on every PR; both must pass to merge. Release workflow re-runs them before publishing.

## Release flow

Trunk-based: PR → merge `main` → `release.yml` runs semantic-release (computes version from Conventional Commits, updates CHANGELOG, tags, creates GitHub Release) → separate `publish` job uses npm Trusted Publishing (OIDC, no token) to push to npm with provenance.

Channels: `latest` only (v1). Atomicity check: publish step verifies version is live on npm registry before exiting; phantom releases (tag exists but npm doesn't) fail loud.

Local dev:
```bash
npm install            # installs devDeps + husky hook
node scripts/install-skills.mjs   # symlink-equivalent into ~/.claude/skills/
```

## Dogfooding

When iterating on a skill, invoke it against fixtures:
- `tests/fixtures/prompt-google-login.md` — text prompt
- `tests/fixtures/half-baked-story.md` — refine target
- `tests/fixtures/oversized-story.md` — split target

Committed golden outputs live under `examples/outputs/<slug>/` (the duo: `story.standard.md` + `story.dev.md`). `tests/skills-shape.test.mjs` asserts the PM file carries no technical leakage. If you change a skill's behavior, also update its golden outputs and the matching slash command body in `commands/<name>.md`.

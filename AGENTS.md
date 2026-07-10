# storywright — dogfood guide

Tells coding agents (Claude Code and any AGENTS.md-aware tool) how to behave when invoked in this repo.

## Repo type

Skills pack for Claude Code and any other SKILL.md-compatible agent (Cursor 2.4+, Copilot agent mode, Codex CLI). Markdown-driven. Distributed as pure Markdown skills via skills.sh (`npx skills`) or a direct git clone — no npm package, no CLI, no runtime; all behavior lives in the Markdown skills.

Two invariants govern everything the skills produce; internalize them before editing any skill:

- **Two-file output (PM↔dev split).** Every story renders as `story.standard.md` (PM-facing — no technical detail) + `story.dev.md` (dev-facing — full detail). Never leak technical content into the PM file.
- **Project-less.** Stories are inferred from the prompt/image input, never grounded in the open repo (see convention 7 below).

> **Canonical context:** for architecture, the AI/agent model, story-generation internals, and the glossary, read [`docs/storywright-master-context.md`](docs/storywright-master-context.md) first.

## Layout

```
storywright/
├── skills/
│   └── storywright/          ← the ONLY install unit (picker sees exactly one)
│       ├── SKILL.md          ← router: intent dispatch (generate/refine/split/batch)
│       ├── references/       ← 11 reference files, read on demand (not a picker unit)
│       └── templates/        ← story.standard.md / story.dev.md render templates
├── scripts/                  ← validate-skills.mjs + shared lib (no installer)
└── .github/workflows/        ← CI + release pipeline
```

## When working in this repo

1. **Adding / editing the skill**
   There is one install unit: `skills/storywright/SKILL.md` (the router) plus its `references/<name>.md` files. Keep frontmatter complete: `name`, `description` (≤200 chars), `trigger`, `intent`, `version`, `inputs`, `outputs`. The router has no `composes:` — instead its body links each `references/<name>.md` it depends on. A `references/*.md` file has no frontmatter and is never a separate picker unit; it travels atomically with `SKILL.md` because skills.sh's `copyDirectory` copies the whole `skills/storywright/` folder recursively. Run `npm run validate` before committing.

2. **No slash-command wrappers.**
   The pack ships a single entry point — the `storywright` skill — and no `commands/*.md` wrappers. The router auto-detects intent from the input (its `### Routing` dispatch), so a separate command file per intent is unnecessary. When a caller wants to pin the intent explicitly, they include an `Intent: generate|refine|split|batch` line in the invoking message; the router honors that as the highest-precedence routing signal and does not re-derive intent. Do not reintroduce a `commands/` directory.

3. **Reference-link integrity is enforced.** Validator (`scripts/validate-skills.mjs`) fails if the router body (or any `references/*.md` body) links a `references/<name>.md` that does not exist, **or if any `references/*.md` file is orphaned** (linked by nothing). There is no `composes:`/orphan-component check anymore — the single skill's own reference graph is the whole composition surface. The five enrichment references (`business-rules`, `edge-cases`, `analytics-events`, `risks-and-dependencies`, `definition-of-done`) feed `story.dev.md` per `storywright-base` rule 3 — never the PM body (except Business Rules, an optional PM section). The `estimation` reference runs after INVEST and feeds `## Estimate` into `story.dev.md` only.

4. **Output language.** Skills must respond in the input language. Don't force English. Detect Spanish / English / other from the user message.

5. **Never auto-split a story.** Splitting always waits for user approval via inline `AskUserQuestion` — never auto-splits silently. Pre-split INVEST gates also apply (V FAIL → not a story; T/N FAIL → refine; E unknowns → spike; I/E/S FAIL → split).

6. **Multi-source inputs are first-class.** When user passes text + image simultaneously, follow the source-priority matrix in `skills/storywright/SKILL.md` (the `#### generate` routing subsection's "Mixed-input source priority" table). Surface conflicts as BLOCKING clarifications, never silently pick a winner.

7. **Project-less — never ground stories in the open repo.** storywright generates a forward contract, not a code analysis. When generating or refining a story, do NOT read, scan, or infer from the files of whatever repository is open in the session — even if they look relevant. All technical detail in `story.dev.md` is domain-knowledge inference, marked `⚠️ Assumed:`, never scraped from a codebase. This is `storywright-base` hard rule 14; grounding silently makes output non-deterministic and gives false confidence. (Editing the pack's OWN source — skills, scripts, tests — is normal repo work and unaffected; this rule is about the *generated stories*, not your edits.)

8. **Clean room.** Do not copy content from `deanpeters/Product-Manager-Skills` (CC BY-NC-SA — incompatible with our MIT). Inspired-by only: frontmatter shape, body skeleton, INVEST + Humanizing Work pattern catalog. All prose, taxonomy, and templates are this repo's own.

## Skills surface

One install unit, `storywright`, routed by intent. The picker shows exactly one entry; the router auto-detects the intent from the input (a caller may pin it explicitly with an `Intent: <name>` line in the invoking message):

| Intent | When |
|---|---|
| generate | Ambiguous prompt / screenshot → full story |
| refine | Existing story → audit + fill gaps in place |
| split | Oversize story → INVEST-driven epic + children |
| batch | Multi-item backlog → one story per item in a single pass |

The 11 reference files under `skills/storywright/references/`, read on demand by the router for every intent (progressive disclosure — never separate picker units):
- `storywright-base` — shared rulebook (hard rules, canonical shape, PM↔dev split, mechanical pre-split/deps, language detect). Every intent reads this.
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
- **Dual output mandatory.** Every story-producing intent emits two files per story: `story.standard.md` (PM-facing, no technical detail) + `story.dev.md` (dev-facing, full technical detail). This includes children produced by the split intent (one duo per child, `NN-<slug>.standard.md` + `NN-<slug>.dev.md`). The epic itself is now a PM↔dev duo too (`epic.standard.md` + `epic.dev.md`) — it is no longer a single-file exception. Core PM sections always; optional PM sections only when populated; technical detail (edge cases, risks, analytics, command-level DoD) lives in `story.dev.md` (and `epic.dev.md`) only.

## Validation

```bash
npm run validate    # frontmatter + structure linter (scripts/validate-skills.mjs)
npm test            # snapshot + shape tests (tests/*.test.mjs)
```

Both run in CI on every PR; both must pass to merge. Release workflow re-runs them before publishing.

## Release flow

Trunk-based: PR → merge `main` → `release.yml` runs semantic-release (computes version from Conventional Commits, updates CHANGELOG, tags, creates GitHub Release). No package registry publish — the git tag is the distributable artifact; skills.sh/git consumers pin a version via that tag.

Local dev:
```bash
git clone git@github.com:pavp/storywright.git && cd storywright
npm install            # installs devDeps + husky hook (validate/test/commitlint only)
npm run validate && npm test
```

To exercise skills against a live agent while developing, point the agent's skills directory at your clone (symlink or clone directly into it), e.g.:
```bash
ln -s "$(pwd)/skills/storywright" ~/.claude/skills/storywright
```
Restart the agent afterward — installed-on-disk does not hot-reload.

## Dogfooding

When iterating on the skill, invoke it against fixtures:
- `tests/fixtures/prompt-google-login.md` — generate target
- `tests/fixtures/half-baked-story.md` — refine target
- `tests/fixtures/oversized-story.md` — split target
- `tests/fixtures/backlog-checkout-grooming.md` — batch target

Committed golden outputs live under `examples/outputs/<slug>/` (the duo: `story.standard.md` + `story.dev.md`; the split golden emits an epic duo — `epic.standard.md` + `epic.dev.md` — plus one duo per child, children named `NN-<slug>.{standard,dev}.md`). `tests/skills-shape.test.mjs` asserts the PM file carries no technical leakage. If you change the skill's behavior, also update its golden outputs.

**Golden-folder-naming exemption.** `examples/outputs/` folder names (e.g. `story-split-oversized`, `backlog-grooming`) are stable illustrative identifiers, exempt from the runtime `YYYY-MM-DD-HHmm-<type>-<slug>/` folder-naming rule — the golden folder is not renamed to a date+`-epic-<slug>` form even though its CONTENTS follow the new epic-duo + `NN-<slug>` shape.

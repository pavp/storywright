# storywright — dogfood guide

Tells Claude Code how to behave when invoked in this repo.

## Repo type

Skills pack for Claude Code. Markdown-driven. The npm package is a thin installer; no runtime, no LLM calls in code.

## Layout

```
storywright/
├── skills/                   ← knowledge (Markdown w/ YAML frontmatter)
│   ├── story-generate/
│   ├── story-refine/
│   ├── story-split/
│   ├── story-from-figma/
│   └── _components/          ← 9 components composed by top-level skills
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

3. **Composition is enforced.** Validator (`scripts/validate-skills.mjs`) fails if `composes:` references a non-existent component.

4. **Output language.** Skills must respond in the input language. Don't force English. Detect Spanish / English / other from the user message.

5. **Never auto-split a story.** Splitting always waits for user approval via inline `AskUserQuestion` — never auto-splits silently. Pre-split INVEST gates also apply (V FAIL → not a story; T/N FAIL → refine; E unknowns → spike; I/E/S FAIL → split).

6. **Multi-source inputs are first-class.** When user passes text + image + Figma simultaneously, follow the source-priority matrix in `skills/story-generate/SKILL.md` ("Mixed inputs" section). Surface conflicts as BLOCKING clarifications, never silently pick a winner.

7. **Clean room.** Do not copy content from `deanpeters/Product-Manager-Skills` (CC BY-NC-SA — incompatible with our MIT). Inspired-by only: frontmatter shape, body skeleton, INVEST + Humanizing Work pattern catalog. All prose, taxonomy, and templates are this repo's own.

## Skills surface

The 4 top-level skills:

| Skill | When | Slash command |
|---|---|---|
| `story-generate` | Ambiguous prompt / screenshot / Figma → full story | `/storywright-story-generate` |
| `story-refine` | Existing story → audit + fill gaps in place | `/storywright-story-refine` |
| `story-split` | Oversize story → INVEST-driven epic + children | `/storywright-story-split` |
| `story-from-figma` | Figma URL → one story per flow | `/storywright-story-from-figma` |

The 9 components (composed by top-level skills):
- `clarification-questions` — minimum critical questions across 9 axes (including multi-source conflicts)
- `acceptance-criteria` — Given/When/Then ACs; splitting signal on multiple When/Then
- `invest-checklist` — INVEST self-check with verdict mapping to next action
- `definition-of-done` — DoD checkbox baseline, trimmable per surface
- `business-rules` — policy invariants (eligibility / limits / permissions / data validity / compliance / lifecycle)
- `edge-cases` — 8 axes (boundary / network / concurrency / permission / data / state / external / UX)
- `analytics-events` — funnel events + payload taxonomy with PII boundary
- `risks-and-dependencies` — risks (technical / product / security / ops) + deps with owner+status
- `jira-wiki-formatter` — renders core (always) + optional (only when non-empty), dual format

## Repo conventions

- **Conventional Commits required.** commitlint via husky. `feat:` / `fix:` / `docs:` / `refactor:` / `perf:` / `build:` trigger releases. `chore:` / `ci:` / `test:` / `style:` don't.
- **Node 22+** in CI; Node 20+ minimum for scripts.
- **Pure ESM** (`"type": "module"` + `.mjs`). No CommonJS.
- **No build step.** Scripts are runnable directly via `node`.
- **No LLM in code.** All AI behavior lives in the Markdown skills.
- **Dual output mandatory.** Every story-producing skill emits `story.jira-wiki.md` + `story.standard.md`. Core sections always; optional sections only when populated.

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

If you change a skill's behavior, also update its example outputs and the matching slash command body in `commands/<name>.md`.

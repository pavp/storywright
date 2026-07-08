# storywright

[![npm](https://img.shields.io/npm/v/@pavp/storywright.svg)](https://www.npmjs.com/package/@pavp/storywright)
[![CI](https://github.com/pavp/storywright/actions/workflows/ci.yml/badge.svg)](https://github.com/pavp/storywright/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@pavp/storywright.svg)](./LICENSE)

Turn ambiguous inputs — vague prompts, half-baked stories, screenshots, raw backlogs — into **Jira-ready user stories** for Claude Code. Every story comes out INVEST-checked, with Given/When/Then acceptance criteria, a Fibonacci estimate, and a clean split between what the PM reads and what the developer needs.

> Inspired by [`deanpeters/Product-Manager-Skills`](https://github.com/deanpeters/Product-Manager-Skills) (CC BY-NC-SA 4.0). Clean-room MIT rewrite — no copied content; only the frontmatter shape, body skeleton, and splitting-pattern selection draw on patterns from that repo. All prose, taxonomy, output model, and rubrics are this repo's own. Methodological credit: Bill Wake (INVEST), Mike Cohn (*User Stories Applied*), Dan North (BDD / Given-When-Then), Richard Lawrence & Peter Green (*Humanizing Work* splitting patterns).

## What it is

A **skills pack for Claude Code** — not a runtime, no LLM inside, no API calls in code. The skills are Markdown files Claude Code reads as instructions; the npm package is a thin installer that copies them into `~/.claude/skills/`. All the behavior lives in the prose.

Two design choices shape everything:

- **Two-file output (the PM↔dev split).** Every story is rendered as `story.standard.md` (PM-facing — user story, acceptance criteria, Definition of Done; zero technical detail) and `story.dev.md` (dev-facing — edge cases, analytics, risks, dependencies, the estimate, command-level DoD). The PM never wades through implementation detail; the developer never loses it.
- **Project-less by design.** storywright writes a *forward contract* for work that often doesn't exist yet. It does **not** read your codebase — technical specifics in the dev file are domain-knowledge inferences (marked `⚠️ Assumed:`), never scraped from whatever repo happens to be open. That keeps output deterministic and portable.

## Install

```bash
npm install -g @pavp/storywright
storywright install
```

Restart Claude Code so the skills and slash commands are picked up.

<details>
<summary>Other install paths</summary>

- **Git clone + symlink** (contributors):
  ```bash
  git clone git@github.com:pavp/storywright.git && cd storywright
  ln -s "$(pwd)/skills" ~/.claude/skills/storywright
  ```
- **ZIP upload to claude.ai**:
  ```bash
  storywright zip story-generate   # → dist/story-generate.zip, upload via the claude.ai UI
  ```
</details>

## Use

Each skill has a slash command (installed as `/storywright-<skill>`), or you can describe the task in plain language and Claude Code routes it.

```
/storywright-story-generate Permitir login con Google
```
```
/storywright-story-refine
<paste a half-baked story>
```
```
/storywright-story-split
<paste a story that visibly mixes flows>
```
```
/storywright-story-batch
1. Show a cart summary before payment
2. Apply a discount code at checkout
3. Handle the full payment flow…
```

storywright replies in the language of your input — paste Spanish, get Spanish.

### Example output

A `story.standard.md` (PM-facing) is plain portable Markdown that pastes cleanly into Jira Cloud, Notion, or Linear:

```markdown
# Login con Google

**Summary:** Permitir que un visitante nuevo se autentique con su cuenta de Google.

## User Story
- **As a** visitante nuevo sin cuenta
- **I want to** iniciar sesión con mi cuenta de Google
- **so that** entro al producto sin crear una contraseña nueva

## Acceptance Criteria
**AC-1: Login exitoso con cuenta válida**
- **Given** el visitante está en la pantalla de login
- **When** toca "Continuar con Google" y autoriza una cuenta válida
- **Then** se crea su sesión y es redirigido al dashboard en <3s
```

The companion `story.dev.md` carries everything technical — including a Fibonacci estimate with an auditable breakdown:

```markdown
## Estimate
**Story Points: 5** (Fibonacci)

| Signal | Value | Weight | Contribution |
|--------|-------|--------|--------------|
| Acceptance Criteria | 1 | ×1.0 | 1.0 |
| Edge Cases | 5 | ×0.6 | 3.0 |
| Dependencies | 3 | ×1.5 | 4.5 |
| ...
```

See the full committed examples under [`examples/outputs/`](./examples/outputs/).

## Skills

Four top-level skills, each invokable as `/storywright-<name>`:

| Skill | When to use |
|---|---|
| `story-generate` | An ambiguous prompt, screenshot, or fresh story request → one full story |
| `story-refine` | An existing story that's incomplete or weakly specified → audit + fill gaps in place |
| `story-split` | A story that fails INVEST on Independent / Estimable / Small → epic + child stories |
| `story-batch` | A multi-item backlog → one story per item in a single pass, plus a backlog summary |

They never split silently — a split always waits for your approval. And no story is ever auto-grounded against your open repo.

### Components

All four top-level skills compose the same eleven components:

- `storywright-base` — the shared rulebook: canonical story shape, the PM↔dev split, language detection, the mechanical pre-split test, INVEST handling, and the project-less rule. Everything else inherits from it.
- `clarification-questions` — the minimum critical questions to ask before drafting
- `acceptance-criteria` — Given/When/Then acceptance criteria
- `invest-checklist` — INVEST self-check, mapping the verdict to the next action
- `definition-of-done` — DoD baseline (acceptance-only in PM files, full command-level in the dev file)
- `business-rules` — policy invariants
- `edge-cases` — eight technical failure axes → dev file only
- `analytics-events` — funnel events + payload taxonomy with a PII boundary → dev file only
- `risks-and-dependencies` — risks and blocking dependencies with owner + status → dev file only
- `estimation` — relative Fibonacci story points from countable signals (ACs, edge cases, deps, risks) → dev file only
- `story-formatter` — renders the two-file output

## Multimodal input

| Input | Runtime | Notes |
|---|---|---|
| Text | Native | Always available |
| Images (PNG / JPG) | Claude vision | Drop the file into chat |

When you pass both at once (text + image), storywright follows a source-priority matrix and surfaces genuine conflicts as blocking clarifications — it never silently picks a winner.

## CLI

```bash
storywright install            # copy skills + slash commands into ~/.claude/
storywright list               # show available + installed skills
storywright validate           # lint skill files (frontmatter + composition)
storywright zip <skill-name>   # build a ZIP for claude.ai upload
storywright uninstall          # remove from ~/.claude/
```

## Multi-provider stance

Skills are written in **format-neutral Markdown** with optional `<claude-specific>` blocks. Non-Claude LLMs ignore those blocks; Claude reads them. No adapters are shipped — that's a downstream concern.

## Releases

`semantic-release` + Conventional Commits + GitHub Actions + npm Trusted Publishing (OIDC). Merge to `main` → version bump → publish, on a single `latest` channel. See [CONTRIBUTING.md](./CONTRIBUTING.md) and [AGENTS.md](./AGENTS.md) (the guide for coding agents working in this repo).

## License

MIT

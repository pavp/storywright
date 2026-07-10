# storywright

[![CI](https://github.com/pavp/storywright/actions/workflows/ci.yml/badge.svg)](https://github.com/pavp/storywright/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Turn ambiguous inputs — vague prompts, half-baked stories, screenshots, raw backlogs — into **Jira-ready user stories** for Claude Code. Every story comes out INVEST-checked, with Given/When/Then acceptance criteria, a Fibonacci estimate, and a clean split between what the PM reads and what the developer needs.

> Inspired by [`deanpeters/Product-Manager-Skills`](https://github.com/deanpeters/Product-Manager-Skills) (CC BY-NC-SA 4.0). Clean-room MIT rewrite — no copied content; only the frontmatter shape, body skeleton, and splitting-pattern selection draw on patterns from that repo. All prose, taxonomy, output model, and rubrics are this repo's own. Methodological credit: Bill Wake (INVEST), Mike Cohn (*User Stories Applied*), Dan North (BDD / Given-When-Then), Richard Lawrence & Peter Green (*Humanizing Work* splitting patterns).

## What it is

A **pure Markdown skills pack** — not a runtime, no LLM inside, no API calls in code, no npm package to install. The skills are `SKILL.md` files any SKILL.md-compatible agent (Claude Code, Cursor 2.4+, Copilot agent mode, Codex CLI) reads as instructions directly from disk. All the behavior lives in the prose.

Two design choices shape everything:

- **Two-file output (the PM↔dev split).** Every story is rendered as `story.standard.md` (PM-facing — user story, acceptance criteria, Definition of Done; zero technical detail) and `story.dev.md` (dev-facing — edge cases, analytics, risks, dependencies, the estimate, command-level DoD). The PM never wades through implementation detail; the developer never loses it.
- **Project-less by design.** storywright writes a *forward contract* for work that often doesn't exist yet. It does **not** read your codebase — technical specifics in the dev file are domain-knowledge inferences (marked `⚠️ Assumed:`), never scraped from whatever repo happens to be open. That keeps output deterministic and portable.

## Install

storywright is a git repo of skills — no package to install, no CLI to run. Install it with **[skills.sh](https://skills.sh)** (`npx skills`, the cross-agent skill installer from Vercel Labs). It works with Claude Code, Cursor, Codex, Copilot, and other SKILL.md-compatible agents.

**With skills.sh** — no install step; `npx` fetches the tool on demand:
```bash
npx skills add pavp/storywright
```
This detects your agent and copies the skills into the right place. `pavp/storywright` is the GitHub repo — [github.com/pavp/storywright](https://github.com/pavp/storywright) — not an npm package; storywright ships no npm package. Use `--list` to see the skills first, or `-a claude-code -a cursor` to target specific agents.

**Without skills.sh** — clone the repo straight into your agent's skills directory:
```bash
git clone https://github.com/pavp/storywright.git ~/.claude/skills/storywright
```
Swap `~/.claude/skills/` for whatever your agent uses — `~/.cursor/skills/`, `~/.codex/skills/`, `~/.copilot/skills/`, or the universal `~/.agents/skills/`.

Restart your agent so the skill is picked up.

## Use

Just describe the task in plain language — the `storywright` skill auto-detects the intent (generate / refine / split / batch) from your input and routes it. Ships no slash commands; if you want to force a particular intent, add an `Intent: <name>` line to your message.

```
Permitir login con Google
```
```
<paste a half-baked story>
```
```
<paste a story that visibly mixes flows>
```
```
Intent: batch
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

One install unit — `storywright` — routed by intent. The router auto-detects the intent from your input (pin it explicitly with an `Intent: <name>` line if you want to override the detection):

| Intent | When to use |
|---|---|
| generate | An ambiguous prompt, screenshot, or fresh story request → one full story |
| refine | An existing story that's incomplete or weakly specified → audit + fill gaps in place |
| split | A story that fails INVEST on Independent / Estimable / Small → epic + child stories |
| batch | A multi-item backlog → one story per item in a single pass, plus a backlog summary |

They never split silently — a split always waits for your approval. And no story is ever auto-grounded against your open repo.

### References

The router reads the same eleven reference files for every intent, on demand:

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

A reference file has no frontmatter and is never a separate install unit — it travels atomically with the one `SKILL.md` because skills.sh copies the whole `skills/storywright/` folder recursively.

## Multimodal input

| Input | Runtime | Notes |
|---|---|---|
| Text | Native | Always available |
| Images (PNG / JPG) | Claude vision | Drop the file into chat |

When you pass both at once (text + image), storywright follows a source-priority matrix and surfaces genuine conflicts as blocking clarifications — it never silently picks a winner.

## Multi-provider stance

Skills are written in **format-neutral Markdown** with optional `<claude-specific>` blocks. Non-Claude LLMs ignore those blocks; Claude reads them. No adapters are shipped — that's a downstream concern.

## Releases

`semantic-release` + Conventional Commits + GitHub Actions. Merge to `main` → version computed from commit history → git tag + GitHub Release + `CHANGELOG.md` update. No package registry involved — skills.sh/git consumers pin a version via the git tag. See [CONTRIBUTING.md](./CONTRIBUTING.md) and [AGENTS.md](./AGENTS.md) (the guide for coding agents working in this repo).

## License

MIT

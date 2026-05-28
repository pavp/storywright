# storywright

[![npm](https://img.shields.io/npm/v/@pavp/storywright.svg)](https://www.npmjs.com/package/@pavp/storywright)
[![CI](https://github.com/pavp/storywright/actions/workflows/ci.yml/badge.svg)](https://github.com/pavp/storywright/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@pavp/storywright.svg)](./LICENSE)

PM skills for Claude Code that turn ambiguous inputs — vague prompts, half-baked stories, screenshots, Figma links — into **Jira-ready user stories** with acceptance criteria, edge cases, risks, analytics, and Definition of Done.

> Inspired by [`deanpeters/Product-Manager-Skills`](https://github.com/deanpeters/Product-Manager-Skills) (CC BY-NC-SA 4.0). Clean-room MIT rewrite — no copied content. Frontmatter shape, body skeleton, and splitting-pattern selection draw on patterns from that repo; prose, component taxonomy, dual-format output, and risk model are this repo's own. Release pipeline modeled on [`pavp/wavefront`](https://github.com/pavp/wavefront). Methodological credit: Bill Wake (INVEST, 2003), Mike Cohn (*User Stories Applied*, 2004), Dan North (BDD / Given-When-Then), Richard Lawrence & Peter Green (*Humanizing Work* splitting patterns).

## What it is

A **skills pack for Claude Code**, not a runtime. No LLM inside. Skills are Markdown files that Claude Code reads as instructions. The npm package is a thin installer that copies them to `~/.claude/skills/storywright/`.

## Install

```bash
npm install -g @pavp/storywright
storywright install
```

Restart Claude Code so the skills are picked up.

Alternatives:

- **Git clone + symlink** for contributors:
  ```bash
  git clone git@github.com:pavp/storywright.git
  cd storywright
  ln -s "$(pwd)/skills" ~/.claude/skills/storywright
  ```
- **ZIP upload to claude.ai**:
  ```bash
  storywright zip story-generate
  # → dist/story-generate.zip — upload via Claude.ai UI
  ```

## Use

In Claude Code:

```
generate a user story: Permitir login con Google
```

```
refine this story:
<paste a half-baked story>
```

```
generate stories from this Figma: https://www.figma.com/file/…
```

```
this story is too big, split it:
<paste a story that visibly mixes flows>
```

Outputs always include both `story.jira-wiki.md` (Jira wiki markup) and `story.standard.md` (CommonMark).

## Skills

### Top-level
| Skill | When to use |
|---|---|
| `story-generate` | Ambiguous prompt, screenshot, or fresh story request |
| `story-refine` | Existing story that's incomplete or weakly specified |
| `story-split` | Story that fails INVEST on I / E / S — too big |
| `story-from-figma` | Figma file or frame URL → one or more stories |

### Components (composed by the top-level skills)
- `clarification-questions` — minimum critical questions
- `acceptance-criteria` — Given/When/Then ACs
- `invest-checklist` — INVEST self-check with verdict
- `definition-of-done` — DoD checkbox block
- `business-rules` — policy invariants
- `edge-cases` — boundary/network/concurrency/permission/state
- `analytics-events` — funnel events with payload taxonomy
- `risks-and-dependencies` — risks + blocking deps
- `jira-wiki-formatter` — dual-format renderer

## Multimodal

| Input | Runtime | Notes |
|---|---|---|
| Text | Native | Always available |
| Images (PNG/JPG) | Claude vision | Drop file into chat |
| Figma links | MCP Figma server | See `skills/story-from-figma/mcp-figma-notes.md` |

## CLI

```bash
storywright install            # copy skills to ~/.claude/skills/storywright/
storywright list               # show available + installed skills
storywright validate           # lint skill files (frontmatter + structure)
storywright zip <skill-name>   # build a ZIP for Claude.ai upload
storywright uninstall          # remove from ~/.claude/skills/
```

## Multi-provider stance

Skills are written in **format-neutral Markdown** with optional `<claude-specific>` XML blocks. Non-Claude LLMs ignore the XML; Claude reads it. No adapters shipped — downstream concern.

## Releases

`semantic-release` + Conventional Commits + GitHub Actions + npm Trusted Publishing (OIDC). Push to `main` → bump → publish. Single `latest` channel for v1.

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT

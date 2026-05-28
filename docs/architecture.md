# Architecture

## Two layers

```
┌────────────────────────────────────────────┐
│   skills/                                  │  ← knowledge (Markdown)
│     story-generate, story-refine, ...      │
│     _components/...                        │
├────────────────────────────────────────────┤
│   bin/ + scripts/                          │  ← thin installer
│     storywright install | validate | zip  │
└────────────────────────────────────────────┘
                  │
                  ▼
        ~/.claude/skills/storywright/
                  │
                  ▼
              Claude Code (runtime)
                  │
                  ▼
           Anthropic API (provider)
```

- **Skills** = Markdown files with YAML frontmatter. They are the deliverable.
- **CLI/scripts** = file-system operations only. Zero LLM calls.
- **Runtime** = Claude Code, supplied by Anthropic. Not in this repo.

## Composition

Top-level skills name their components in `composes:` frontmatter. The validator confirms every referenced component exists **and that no component is orphaned** (referenced by zero skills). Composition is enforced at lint time, not at runtime — Claude reads the skill body and follows the references naturally.

All four top-level skills (`story-generate`, `story-refine`, `story-split`, `story-from-figma`) compose the **same 10 components**:

```
story-generate / story-refine / story-split / story-from-figma
├─ storywright-base          ← shared rulebook (inherited by all)
├─ clarification-questions
├─ business-rules            ← optional PM section + dev.md
├─ acceptance-criteria
├─ edge-cases                ← dev.md only (rule 3a)
├─ analytics-events          ← dev.md only
├─ risks-and-dependencies    ← dev.md only
├─ definition-of-done        ← acceptance-only in PM, full in dev.md
├─ invest-checklist
└─ jira-wiki-formatter       ← renders the 3-file trio
```

### PM ↔ dev split

The PM-facing files (`story.standard.md`, `story.jira-wiki.md`) carry only what a PM needs — no file paths, imports, or commands (`storywright-base` rule 3). Technical detail produced by the enrichment components (edge cases, analytics events, risks/dependencies, command-level DoD) is **not discarded** — it is rendered into `story.dev.md` (rule 3a). This is why the five enrichment components are composed but never emit sections into the PM body.

## Multi-provider stance

Skills are written in format-neutral Markdown. Each skill ends with an optional `<claude-specific>` XML block holding Claude-tuned directives (extended thinking, prompt caching hints). Other LLMs that read the skills will ignore that block as unknown XML. We do not ship adapter code; that's a downstream concern.

## Risks the design absorbs

| Risk | How the design responds |
|---|---|
| Hallucinated requirements | Every assumed value is wrapped in `> ⚠️ Assumed:` blockquotes |
| Over-splitting | `story-split` proposes; never auto-acts |
| Vision misread | Per-inference confidence; LOW/MEDIUM surfaced as clarifications |
| Figma access failure | Falls back to PNG drop + manual flow description |
| Context drift | Each skill ends with a fresh summary section |
| Locale mismatch | Output language matches input language |
| Provider lock-in | `<claude-specific>` blocks isolate Claude-only optimizations |

## Why no LLM runtime in this package

Building our own runtime would mean owning auth, retry, prompt caching, vision pipelines, MCP wiring, and a maintenance burden that Claude Code already solves. Distributing skills lets us focus on **the prompts themselves**, which is where PM-domain expertise lives. If we ever need a non-Claude-Code runtime, it goes in a sibling repo with adapters — not here.

# Architecture

## One layer, git-distributed

```
┌────────────────────────────────────────────┐
│   skills/                                  │  ← knowledge (Markdown)
│     story-generate, story-refine, ...      │
│     _components/...                        │
├────────────────────────────────────────────┤
│   scripts/validate-skills.mjs              │  ← lint only, no installer
└────────────────────────────────────────────┘
                  │
     git clone / skills.sh / ags install
                  │
                  ▼
        ~/.claude/skills/storywright/
     (or ~/.cursor, ~/.codex, ~/.copilot, ~/.agents)
                  │
                  ▼
         Any SKILL.md-compatible agent
      (Claude Code, Cursor 2.4+, Copilot, Codex CLI)
                  │
                  ▼
              LLM provider (per host)
```

- **Skills** = Markdown files with YAML frontmatter. They are the deliverable, and the only thing this repo ships.
- **scripts/** = validation/test tooling only (`validate-skills.mjs` + fixtures). File-system reads only, zero LLM calls, not an installer — consumers get the files onto disk via git or skills.sh, not this repo's tooling.
- **Runtime** = whichever SKILL.md-compatible agent the consumer runs. Not in this repo.

## Composition

Top-level skills name their components in `composes:` frontmatter. The validator confirms every referenced component exists **and that no component is orphaned** (referenced by zero skills). Composition is enforced at lint time, not at runtime — Claude reads the skill body and follows the references naturally.

All four top-level skills (`story-generate`, `story-refine`, `story-split`, `story-batch`) compose the **same 11 components**:

```
story-generate / story-refine / story-split / story-batch
├─ storywright-base          ← shared rulebook (inherited by all)
├─ clarification-questions
├─ business-rules            ← optional PM section + dev.md
├─ acceptance-criteria
├─ edge-cases                ← dev.md only (rule 3a)
├─ analytics-events          ← dev.md only
├─ risks-and-dependencies    ← dev.md only
├─ definition-of-done        ← acceptance-only in PM, full in dev.md
├─ invest-checklist
├─ story-formatter           ← renders the 2-file duo
└─ estimation                ← Fibonacci ## Estimate → dev.md only (after INVEST)
```

### PM ↔ dev split

The PM-facing file (`story.standard.md`) carries only what a PM needs — no file paths, imports, or commands (`storywright-base` rule 3). Technical detail produced by the enrichment components (edge cases, analytics events, risks/dependencies, command-level DoD) is **not discarded** — it is rendered into `story.dev.md` (rule 3a). This is why the enrichment components are composed but never emit sections into the PM body.

## Multi-provider stance

Skills are written in format-neutral Markdown. Each skill ends with an optional `<claude-specific>` XML block holding Claude-tuned directives (extended thinking, prompt caching hints). Other LLMs that read the skills will ignore that block as unknown XML. We do not ship adapter code; that's a downstream concern.

## Risks the design absorbs

| Risk | How the design responds |
|---|---|
| Hallucinated requirements | Every assumed value is wrapped in `> ⚠️ Assumed:` blockquotes |
| Over-splitting | `story-split` proposes; never auto-acts |
| Vision misread | Per-inference confidence; LOW/MEDIUM surfaced as clarifications |
| Context drift | Each skill ends with a fresh summary section |
| Locale mismatch | Output language matches input language |
| Provider lock-in | `<claude-specific>` blocks isolate Claude-only optimizations |

## Why no LLM runtime in this package

Building our own runtime would mean owning auth, retry, prompt caching, vision pipelines, MCP wiring, and a maintenance burden that Claude Code already solves. Distributing skills lets us focus on **the prompts themselves**, which is where PM-domain expertise lives. If we ever need a non-Claude-Code runtime, it goes in a sibling repo with adapters — not here.

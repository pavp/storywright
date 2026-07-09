# Architecture

## One layer, git-distributed

```
┌────────────────────────────────────────────┐
│   skills/storywright/                      │  ← knowledge (Markdown), ONE install unit
│     SKILL.md          ← router (dispatch)  │
│     references/*.md   ← 11 files, on-demand│
│     templates/*.md                         │
├────────────────────────────────────────────┤
│   scripts/validate-skills.mjs              │  ← lint only, no installer
└────────────────────────────────────────────┘
                  │
     git clone / skills.sh (npx skills)
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

- **Skills** = Markdown files with YAML frontmatter. They are the deliverable, and the only thing this repo ships. There is exactly one install unit — a directory is only a picker entry if it contains a `SKILL.md`; `references/*.md` and `templates/*.md` have no frontmatter, so they are invisible to the picker and travel atomically with the one `SKILL.md` (skills.sh's `copyDirectory` copies the whole folder recursively).
- **scripts/** = validation/test tooling only (`validate-skills.mjs` + fixtures). File-system reads only, zero LLM calls, not an installer — consumers get the files onto disk via git or skills.sh, not this repo's tooling.
- **Runtime** = whichever SKILL.md-compatible agent the consumer runs. Not in this repo.

## Composition

The single `skills/storywright/SKILL.md` is a router: its `## Application` → `### Routing (dispatch)` section detects one of four intents (generate / refine / split / batch) from the input, then reads only the matching `references/*.md` files on demand. There is no `composes:` frontmatter and no per-skill picker units anymore — the validator instead enforces **reference-link integrity**: every `[[name]]` link or `references/<name>.md` mention in the SKILL.md body or in any reference body must resolve to a real file, and every reference file must be linked by at least one body (no orphans).

All four intents read the **same 11 references**:

```
storywright (router, one install unit)
├─ references/storywright-base.md          ← shared rulebook (read by every intent)
├─ references/clarification-questions.md
├─ references/business-rules.md             ← optional PM section + dev.md
├─ references/acceptance-criteria.md
├─ references/edge-cases.md                 ← dev.md only (rule 3a)
├─ references/analytics-events.md           ← dev.md only
├─ references/risks-and-dependencies.md     ← dev.md only
├─ references/definition-of-done.md         ← acceptance-only in PM, full in dev.md
├─ references/invest-checklist.md
├─ references/story-formatter.md            ← renders the 2-file duo
└─ references/estimation.md                 ← Fibonacci ## Estimate → dev.md only (after INVEST)
```

The per-intent order differs only for split (`invest-checklist` is read first, as the pre-split gate); every other intent reads the same set in the same order.

### PM ↔ dev split

The PM-facing file (`story.standard.md`) carries only what a PM needs — no file paths, imports, or commands (`storywright-base` rule 3). Technical detail produced by the enrichment references (edge cases, analytics events, risks/dependencies, command-level DoD) is **not discarded** — it is rendered into `story.dev.md` (rule 3a). This is why the enrichment references are always read but never emit sections into the PM body.

## Multi-provider stance

Skills are written in format-neutral Markdown. Each skill ends with an optional `<claude-specific>` XML block holding Claude-tuned directives (extended thinking, prompt caching hints). Other LLMs that read the skills will ignore that block as unknown XML. We do not ship adapter code; that's a downstream concern.

## Risks the design absorbs

| Risk | How the design responds |
|---|---|
| Hallucinated requirements | Every assumed value is wrapped in `> ⚠️ Assumed:` blockquotes |
| Over-splitting | the split intent proposes; never auto-acts |
| Vision misread | Per-inference confidence; LOW/MEDIUM surfaced as clarifications |
| Context drift | Each skill ends with a fresh summary section |
| Locale mismatch | Output language matches input language |
| Provider lock-in | `<claude-specific>` blocks isolate Claude-only optimizations |

## Why no LLM runtime in this package

Building our own runtime would mean owning auth, retry, prompt caching, vision pipelines, MCP wiring, and a maintenance burden that Claude Code already solves. Distributing skills lets us focus on **the prompts themselves**, which is where PM-domain expertise lives. If we ever need a non-Claude-Code runtime, it goes in a sibling repo with adapters — not here.

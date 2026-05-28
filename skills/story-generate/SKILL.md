---
name: story-generate
description: Transform an ambiguous prompt, half-baked story, screenshot, or Figma link into a Jira-ready user story. Cohn+Gherkin canonical. Asks clarifications ONLY in terminal.
trigger: "/story-generate | generate a user story | write a user story | turn this into a story | crear historia de usuario"
intent: Top-level orchestrator that drafts a fresh story from any input. Follows the same hard rules as story-refine v2.2 (Cohn philosophy, terminal-only Q, no mini-PRD, deterministic split gate).
version: 2.2.0
inputs:
  - text
  - image
  - figma-link
outputs:
  - story.standard.md
  - story.jira-wiki.md
  - .storywright-context.json
composes:
  - _components/clarification-questions
  - _components/acceptance-criteria
  - _components/invest-checklist
  - _components/definition-of-done
  - _components/business-rules
  - _components/edge-cases
  - _components/analytics-events
  - _components/risks-and-dependencies
  - _components/jira-wiki-formatter
---

## Purpose

Take whatever the PM has — a one-liner, a half-baked story, a screenshot, a Figma link — and produce a Cohn+Gherkin story an engineer can pick up and ship without follow-up questions. If the input is too broad, recommend `/story-split` instead of producing a mini-PRD.

## Hard rules (no exceptions)

1. **Terminal-only clarifications.** Never write any sidecar question file (no `clarifications.md`). All gap questions go through `AskUserQuestion` (batch in groups of ≤4). Non-blocking gaps → mark `⚠️ Assumed` inline.

2. **Cohn + Gherkin canonical.** One Use Case block. One AC scenario per story (one Given chain, one `When`, one `Then`). If the input naturally needs >1 `When`/`Then` → STOP drafting, recommend `/story-split`.

3. **No mini-PRDs.** Prohibited in story output:
   - NFR blocks (a11y/i18n/perf/tokens) — these live in the team's DoD
   - Edge Cases enumerations as a section — surface inside AC failure paths only
   - Dependencies as prose — Jira links only
   - Per-claim visual specs — use single banner (rule 5)
   - Refinement logs >3 lines (>5 if SPLIT)

4. **Output language matches the user's chat language**, not the input's. Auto-detect first (see rule 4a); only ask via `AskUserQuestion` if signals split.

5. **Visual inference confidence — single banner only.** ONE banner at the top of the Design Reference block declares the source type. Claims under it inherit confidence:
   - Raster source (PNG/JPG) → `**Source: raster mockup → all visual specs are pixel-derived, not token-confirmed.**`
   - Figma source → `**Source: Figma → values can be tokenized at implementation.**`
   - Design-token source → `**Source: design tokens → values are authoritative.**`
   - Never assert hex / px / spacing from raster without the raster banner.

6. **Sibling task IDs.** If the draft references "next task / future task / another story" → check `<output-folder>/.storywright-context.json` first. If unresolved, ask. Tentative slugs follow rule F.

7. **Mockup chrome detection — closed list.** Chrome = `left nav rail / sidebar`, `top bar`, `footer`, `persistent toast/snackbar slot`, `persistent modal scrim`, `app-level tabs`. If image shows any AND the input does not mention them, ask via `AskUserQuestion` whether each is in-scope, sibling-scope, or out-of-scope. Anything not on the list is NOT chrome.

8. **Anti-PRD is part of INVEST `Small`.** See `[[invest-checklist]]` Small criterion (line-count ceiling lives there).

9. **Cross-skill context persistence.** When the skill resolves clarifications, write answers to `<output-folder>/.storywright-context.json`. Read only from the exact output folder of the current invocation; never search siblings or parents. Schema:
   ```json
   {
     "version": 1,
     "decided_at": "<ISO date>",
     "decided_by_skill": "story-generate",
     "language": "EN | ES | ...",
     "chrome_scope": "in-scope | in-scope-placeholder | sibling | out-of-scope",
     "siblings": "TODO | <list of IDs> | not-applicable",
     "design_source": "raster | figma | tokens",
     "naming_pattern": "<see rule F>",
     "extra": {}
   }
   ```

10. **Mixed input conflict detection.** When text + image + Figma disagree, surface as BLOCKING `AskUserQuestion`. Never silently pick a winner. (See source priority below.)

11. **Passive-goal downstream prompt (G).** If `I want to` verb is observational (`view, see, read, browse, look at, inspect, monitor`) and `so that` lacks a follow-up user action → ask once via `AskUserQuestion`: "What does the user do with this?". Strengthen the `so that` accordingly.

### 4a. Language auto-detect — expanded signals (E)

| Signal | Where | Weight |
|---|---|---|
| Gherkin keywords ("Given/When/Then") | AC block | high |
| Persona phrasing ("As a user" vs "Como un usuario") | Use Case | high |
| Column / field names ("Phone - primary", "Teléfono - principal") | AC bullets | medium |
| Domain verbs ("clicking" vs "hacer clic") | AC bullets | medium |
| Title language | header | low |

**Decision:**
- High+medium signals agree on M → adopt M silently. Mark inline `⚠️ Assumed: output language = <M> (auto-detected from <signals>)`.
- Signals split → ask once.
- Persist via rule 9.

### Rule F. Naming pattern — ask once, persist

When the skill needs to invent a tentative ticket slug AND `.storywright-context.json` has no `naming_pattern`, ask once:
- kebab-case feature-action (`customer-search-bar-wire`)
- verb-noun (`wire-search-bar`)
- domain-action (`search.customer.wire-input`)
- Jira prefix + numeric (`CSB-001`)

Persist in `.storywright-context.json`. Reuse for all sibling slugs.

### Rule D. Surface vs styling (deterministic)

A "named UI surface" counts as a separate outcome ONLY if it has its own user goal (verb where the user *does something with it*). If a noun is mentioned only in a styling context (color, padding, background) or as a sub-component of a parent surface (column inside a grid) → it is NOT a surface, it is styling. Count = 0.

## When to use

- The user has a goal but not a story (e.g., "Permitir login con Google").
- The user pastes a vague story and wants it production-ready.
- The user drops an image/Figma link and asks for stories.

For inputs that clearly cover multiple outcomes → run the deterministic split gate (step 6 below) and recommend `/story-split` instead of drafting.

## Inputs & how to interpret each

### Text prompts
Anything from a phrase to a paragraph. If only a feature is named, infer the implicit user goal and confirm via rule G if passive.

### Local images (PNG/JPG)
Use vision. Extract UI elements, visible states, inferred flow, confidence per inference. Anything below high confidence → mark inline `⚠️ Assumed`. NEVER assert pixel-precise visual specs inline with each claim — use the single banner (rule 5).

### Figma links
If MCP Figma is available (see `[[story-from-figma]]`), use it. If not, fall back to asking the user for screenshots.

### Mixed inputs (text + image + Figma) — source priority

| Section | Primary | Secondary | Tertiary |
|---|---|---|---|
| User Story / Goal | Text | Figma frame titles | Image |
| Scope | Text | Figma | Image |
| UI Components / States | Figma | Image | Text |
| AC observable outcomes | Triangulate | — | — |

**Conflicts → BLOCKING `AskUserQuestion`.** Never silently pick a winner.

## Canonical output shape

```markdown
### [Title]

#### Use Case
- **As a** [persona — never just "user"]
- **I want to** [action]
- **so that** [outcome with downstream action — rule G]

#### Preconditions (optional)
- ...

#### Out of Scope (optional)
- ...

#### Acceptance Criteria
- **Scenario:** [single-outcome scenario name]
- **Given:** [context — surface nouns drive downstream dep matrix]
- **and Given:** [context]
- **When:** [single trigger]
- **Then:** [single observable outcome]

#### Design Reference (optional)
**Source: <raster | figma | tokens> → <banner from rule 5>**
- [link or path]
- visual notes: [...]

#### INVEST
- I/N/V/E/S/T — one line each.
- **Verdict:** READY | SPLIT RECOMMENDED | NEEDS REFINEMENT | NOT A STORY

#### Generation log (≤3 lines; ≤5 if SPLIT)
- ...
```

Nothing else. No NFR. No edge-cases enumeration. No deps prose. No Assumptions block.

## Application (step-by-step)

0. **Detect input types** — text / image / figma-link / combination. Run conflict detection (rule 10) BEFORE drafting. Run chrome detection (rule 7).

1. **Read prior context.** If `<output-folder>/.storywright-context.json` exists (exact folder only), load it.

2. **Language resolution** (rule 4 + 4a). Auto-detect using expanded signals; ask only on split.

3. **Persona sharpening.** If persona is "user" / "customer" / "person", ask via `AskUserQuestion` for the specific role (e.g., "Sales person", "Workspace admin"). Generic personas hide motivation.

4. **Passive-goal check (rule G).** If `I want to` verb is observational + `so that` lacks downstream action → ask once.

5. **Gap-check** via `[[clarification-questions]]`. BLOCKING gaps → `AskUserQuestion` batched ≤4. Non-blocking → fill inline `⚠️ Assumed`.

6. **Deterministic pre-split test.** Count outcomes using the same rule as `[[story-refine]]`:
   - +1 per AC bullet with action verb at user level
   - +1 per distinct `When [event]`
   - +1 per named UI surface with its own user goal (rule D)
   - 0 for styling, sub-components, passive layout assertions
   - Count ≥2 → STOP. Recommend `/story-split`. List candidate children + per-pair dep notes (rule A) + V audit (rule C from refine).

7. **Draft the canonical block** (Use Case + AC + Design Ref + INVEST). Preserve user wording where good.

8. **Run INVEST** via `[[invest-checklist]]`.
   - `READY` → render.
   - `SPLIT RECOMMENDED` → STOP, recommend split.
   - `NEEDS REFINEMENT` → iterate failing dimension, max 1 cycle, then STOP.
   - `NOT A STORY` → tell user it's a tech task and stop.

9. **Render** both outputs via `[[jira-wiki-formatter]]`. Files: `story.standard.md` + `story.jira-wiki.md`. Plus `.storywright-context.json`. No other files.

10. **Generation log** ≤3 bullets (≤5 if SPLIT) at end of story.

## Examples

### Good — text prompt
Input: *"Permitir login con Google"*
1. Language auto-detect → ES (persona "usuario", verbs "permitir").
2. Persona sharpening → ask: trial user? admin? signed-out visitor?
3. Pre-split count = 1 (one auth flow). Continue.
4. Draft Use Case + 1 AC (happy path, failure as `and Given`).
5. INVEST → READY.
6. Render.

### Good — image input
Input: dashboard screenshot with filter sidebar.
1. Vision extracts filters; one inference at MEDIUM confidence → mark `⚠️ Assumed` inline.
2. Pre-split count = 1 (one filter interaction surface).
3. Draft + INVEST → READY.

### Good — passive-goal prompt fires
Input: "As a user, I want to view list of customers, so that I find details."
- Detected: `view` (passive) + thin `so that`.
- Ask: "What does the user do with the customer they find?"
- User: "Call them."
- Refined `so that`: "so that I can find and call a customer to schedule a service."

### Bad — broad input drafted as one story
Input: *"Build the new dashboard"*
- Pre-split count ≥2 → STOP. Recommend `/story-split`. Do NOT draft a 15-section story.

### Bad — clarifications.md
Writing any sidecar question file. Violates rule 1.

### Bad — per-claim visual tag
`[mockup-pixel-derived]` on every line instead of the single banner. Violates rule 5.

## Common Pitfalls

- Drafting before running the deterministic split gate (step 6).
- Auto-splitting. Never. Propose, wait for `/story-split`.
- Mixing languages. Pick one via rule 4 + 4a.
- Re-asking questions already resolved in `.storywright-context.json`.
- Letting per-claim `[mockup-pixel-derived]` tags litter the output.
- Treating image visual specs as authoritative without the rule-5 banner.

## References

- [[story-refine]] (when input is an existing story)
- [[story-split]] (when INVEST fails on I/E/S)
- [[story-from-figma]] (when input is Figma URL)
- [[clarification-questions]]

<claude-specific>
- Use extended thinking for INVEST + pre-split counting.
- Attach images in the same message for native vision; don't describe-then-reason in two steps.
- Read `.storywright-context.json` ONLY from the exact target output folder.
- Never call Write for any sidecar question file. Use `AskUserQuestion`.
- Treat step 6 (deterministic pre-split test) as a hard gate; do not skip even when the user wants a single story.
</claude-specific>

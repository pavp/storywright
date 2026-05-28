---
name: story-refine
description: Audit an existing user story and fix it in place. Cohn+Gherkin canonical output. Asks clarifications ONLY via terminal (AskUserQuestion) — never writes sidecar question files. Recommends split when story has multiple outcomes.
trigger: "/story-refine | refine this story | improve this story | refinar historia | this story is incomplete"
intent: Refinement skill for stories that already exist but are incomplete or weakly specified. Default philosophy = Mike Cohn (story is a conversation starter, not a spec). Splits aggressively. Never produces mini-PRDs.
version: 2.1.0
inputs:
  - text
  - image
  - figma-link
outputs:
  - story.standard.md
  - story.jira-wiki.txt
  - .storywright-context.json
composes:
  - _components/clarification-questions
  - _components/acceptance-criteria
  - _components/invest-checklist
  - _components/jira-wiki-formatter
---

## Purpose

Bring an existing user story up to standard *without* turning it into a feature spec. Output is conversation-ready, Cohn-format, Gherkin AC. If the story is too big, recommend split — do not refine an oversized story into a longer one.

## Hard rules (no exceptions)

1. **Terminal-only clarifications.** Never write any sidecar question file. All gap questions go through `AskUserQuestion` (batch in groups of ≤4). If a gap is non-blocking, mark `⚠️ Assumed` inline in the story body — do not ask.

2. **Cohn + Gherkin canonical.** One Use Case block. One AC scenario per story (one Given chain, one `When`, one `Then`). If the story naturally needs >1 `When`/`Then` → **STOP refining, recommend `/story-split`**.

3. **No mini-PRDs.** The following sections are PROHIBITED in story output (they belong to DoD, design handoff, or sibling tickets):
   - Non-Functional Requirements blocks (a11y/i18n/perf/tokens) — these live in the team's global Definition of Done
   - Edge Cases enumerations — sibling stories or DoD
   - Dependencies as prose — use Jira ticket links instead
   - Visual specs derived from raster mockups (pixel measurements, hex inferences) inline with each claim
   - Refinement logs >3 lines (>5 if verdict is SPLIT RECOMMENDED)

4. **Output language matches the user's chat language**, not the story's. Auto-detect first (see rule 4a); only ask via `AskUserQuestion` if detection is ambiguous.

5. **Visual inference confidence — single banner only.** Do NOT tag every visual claim. Instead, add ONE banner at the top of the Design Reference block declaring the source type. All claims under that block inherit the banner's confidence level.
   - Raster source (PNG/JPG) → banner: `**Source: raster mockup → all visual specs are pixel-derived, not token-confirmed.**`
   - Figma source → banner: `**Source: Figma → values can be tokenized at implementation.**`
   - Design-token source → banner: `**Source: design tokens → values are authoritative.**`
   - Never assert hex values, pixel sizes, or exact spacing from raster without the raster banner.

6. **Sibling task IDs.** If story body references "next task", "future task", "another story", "siblings" — check `.storywright-context.json` first (rule 9). If unresolved, ask via `AskUserQuestion`. If user has none yet, leave a `TODO: link sibling` placeholder, do not invent.

7. **Mockup chrome detection — closed list.** Chrome = exactly these elements:
   - left nav rail / sidebar
   - top bar (user menu, global breadcrumbs, global search)
   - footer
   - persistent toast/snackbar slot
   - persistent modal scrim
   - app-level tabs

   If companion image shows any of the above and the story body does not mention them, ask via `AskUserQuestion` whether each one is in-scope, sibling-scope, or out-of-scope. Anything not on this list (cards, section headers, in-flow buttons) is NOT chrome — do not surface as a chrome question.

8. **Anti-PRD is part of INVEST `Small`, not a separate step.** See `[[invest-checklist]]` step 7 — line count ceiling lives inside the `Small` criterion so there is one source of truth.

9. **Cross-skill context persistence.** When the skill resolves any clarification via `AskUserQuestion`, write the **answers** to `<output-folder>/.storywright-context.json`. This is NOT a question file — it is a resolved-answers file. Schema:
   ```json
   {
     "version": 1,
     "decided_at": "<ISO date>",
     "decided_by_skill": "story-refine",
     "language": "EN | ES | ...",
     "chrome_scope": "in-scope | in-scope-placeholder | sibling | out-of-scope",
     "siblings": "TODO | <list of IDs> | not-applicable",
     "design_source": "raster | figma | tokens",
     "extra": {}
   }
   ```
   Future skills (`story-split`, `story-from-figma`, etc.) MUST read this file before re-asking the same questions.

10. **Children independence verification (split only).** When the skill recommends or executes split, run an NxN dependency matrix across children. For each pair (Ci, Cj), mark `dep` if Ci's `When` cannot fire without Cj being built first. If any deps found, the affected child's INVEST `Independent` verdict is `PARTIAL · depends on <Cj>`, and the parent EPIC file lists explicit build order. Never claim 5 children are all Independent without running the matrix.

### 4a. Language auto-detect (supports rule 4)

Run cheap detection before asking:
- If user's last 3 chat messages are in language L AND the story body is in language M ≠ L:
  - If the story body uses domain terms in M that are likely contract (column names, AC keywords like "Given/When/Then" already in M) → prefer M, mark inline `⚠️ Assumed: output language = <M> based on AC keywords`
  - Else → ask via `AskUserQuestion` (1 question, 2 options L/M)
- If languages match → no question.
- After resolution, persist via rule 9.

## When to use

- User pastes an existing story (text) and asks to make it Jira-ready.
- A story has ACs but no testable outcomes.
- INVEST gate fails on `Testable` or `Negotiable` — fixable in place (not splittable).

For oversized stories that fail `Independent / Estimable / Small`, OR have multiple `When`/`Then` pairs, OR have >1 distinct outcome (per the deterministic counter below) → hand off to `[[story-split]]` instead.

## Inputs & interpretation

- **text** — existing story. Detect which sections are present, which are missing, which are weak.
- **image (optional)** — companion screenshot/mockup. Use to validate UI claims only. NEVER as source for pixel-precise visual specs inline with each AC claim (see rule 5).
- **figma-link (optional)** — companion design. Use to enrich AC observable outcomes (states, named components).

### Mixed inputs source-priority

- Story text canonical for `User Story / Scope / Business value`.
- Image/Figma canonical for `component names / observable states` referenced inside AC.
- Conflicts → BLOCKING `AskUserQuestion`. Never silently rewrite the story to match the design.

## Canonical output shape (this is the WHOLE story)

```markdown
### [Title]

#### Use Case
- **As a** [persona]
- **I want to** [action]
- **so that** [outcome]

#### Preconditions (optional, only if user provided)
- ...

#### Out of Scope (optional, only if user provided)
- ...

#### Acceptance Criteria
- **Scenario:** [single-outcome scenario name]
- **Given:** [context]
- **and Given:** [context]
- **When:** [single trigger]
- **Then:** [single observable outcome]

#### Design Reference (optional)
**Source: <raster | figma | tokens> → <inherited-confidence banner from rule 5>**
- [link or path]
- visual notes: [...]

#### INVEST
- I/N/V/E/S/T — one line each, evidence-based.
- **Verdict:** READY | SPLIT RECOMMENDED | NEEDS REFINEMENT | NOT A STORY

#### Refinement log (≤3 lines; ≤5 if verdict=SPLIT)
- ...
```

Nothing else. No NFR block. No Edge Cases enumeration. No Dependencies prose. No Assumptions block (assumptions get `⚠️ Assumed` inline or are resolved via `AskUserQuestion`).

## Application (step-by-step)

0. **Detect companion sources** (image, figma-link). Run conflict detection against story text. Run chrome-detection using the closed list in rule 7. Surface conflicts as BLOCKING `AskUserQuestion` calls.

1. **Parse story** into the canonical sections above. Note: present / missing / weak.

2. **Read prior context.** If `<output-folder>/.storywright-context.json` exists, load it. Apply resolved answers; skip the corresponding questions.

3. **Language resolution (rule 4 + 4a).** Auto-detect first. Ask only if ambiguous. Persist answer via rule 9.

4. **Gap-check.** For each weak/missing section:
   - **Blocking** (changes scope, AC outcome, or persona) → `AskUserQuestion` immediately (batched ≤4).
   - **Non-blocking** (additive detail) → fill inline marked `⚠️ Assumed: <text>`. Do not ask.

5. **Sibling reference check (rule 6).** If found and unlinked → ask via `AskUserQuestion` once. Up to 1 batch. Persist via rule 9.

6. **Deterministic pre-split test.** Apply this counter mechanically — do not eyeball:

   **Count = sum of all hits below:**
   | Signal | Hit value |
   |---|---|
   | AC bullet starting with an action verb at the user level ("clicking", "submitting", "entering", "navigating") | +1 each |
   | Distinct `When [event]` phrasing already implied in the story | +1 each |
   | Distinct named UI surface mentioned at the AC level ("grid", "pagination", "counter", "modal", "form", "header bar") | +1 each |

   **Do NOT count:**
   - sub-bullets describing the same flow (column names inside one grid = the grid itself, not separate outcomes)
   - styling of an existing surface (header purple = part of grid, not a new outcome)
   - preconditions or "rendered" statements (passive layout assertions are not Whens)

   **Decision:**
   - Count ≤1 → continue to step 7.
   - Count ≥2 → **STOP. Recommend `/story-split` via terminal message.** Output: list of candidate children + per-pair dependency note (rule 10).

7. **Fill the weak sections** using `[[acceptance-criteria]]` (single Gherkin block) and `[[invest-checklist]]`. Preserve original wording where it was already good.

8. **Run INVEST** via `[[invest-checklist]]` (which now embeds the anti-PRD line-count check inside `Small` — rule 8).
   - `READY` → render.
   - `SPLIT RECOMMENDED` → STOP, recommend split (and run rule 10 children-independence matrix).
   - `NEEDS REFINEMENT` → iterate failing dimension, max 1 cycle, then STOP.
   - `NOT A STORY` → tell user it's a tech task and stop.

9. **Render** both outputs via `[[jira-wiki-formatter]]`. Files: `story.standard.md` + `story.jira-wiki.txt`. Plus `.storywright-context.json`. No other files.

10. **Refinement log** ≤3 bullets (≤5 if SPLIT) appended at story end.

## Examples

### Good — READY
Input: story with title + Use Case + 2 vague ACs.
Output: canonical block, ≤30 lines, AC tightened to single Given/When/Then, INVEST verdict READY, ≤3-line refinement log, `.storywright-context.json` written.

### Good — SPLIT (Spanish)
Input: historia con 7 bullets de AC (grilla + contador + paginación + link).
Output: NO refined story. Mensaje terminal:
```
SPLIT RECOMMENDED. Conteo determinístico = 4 (grilla, contador, paginación, link).
Children candidatos:
1. Page shell + chrome (si in-scope)
2. Grid 5 columnas + header style
3. Contador de resultados
4. Control de paginación
5. Link affordance en customer name
Matriz independencia:
- C4 (paginación) depende de C2 (grid) → marca PARTIAL
- C5 (link) depende de C2 (grid) → marca PARTIAL
- Orden build: C1 → C2 → {C3, C4, C5}
Corré /story-split para expandir.
```

### Bad
Adding NFR / a11y / i18n / Dependencies sections "to be thorough". Violates rule 3.

### Bad
Writing any sidecar question file instead of asking via `AskUserQuestion`. Violates rule 1.

### Bad
Tagging every visual claim with `[mockup-pixel-derived]` instead of using the single banner. Violates rule 5.

### Bad
Claiming 5 children all `Independent` after split without running the NxN matrix. Violates rule 10.

## Common Pitfalls

- Treating refine like generate. If the PM already wrote the user goal, don't restate it.
- Renumbering ACs — append new content, don't shuffle.
- Skipping the deterministic pre-split test (step 6). Refining oversized stories produces oversized refined stories.
- Eyeballing outcome counts instead of running the table in step 6.
- Re-asking questions already answered in `.storywright-context.json`.

## References

- [[story-generate]]
- [[story-split]]
- [[invest-checklist]]
- [[acceptance-criteria]]

<claude-specific>
- Diff the original sections against the refined ones in your reasoning; only emit changes that materially improve the story.
- Never call Write for any question/clarification sidecar file. Use `AskUserQuestion`.
- Treat step 6 (deterministic pre-split test) as a hard gate; do not skip even when the user explicitly asks to refine.
- Always read `.storywright-context.json` if it exists in the target output folder before asking any question.
- After split, run the NxN matrix in your reasoning before claiming Independence per child.
</claude-specific>

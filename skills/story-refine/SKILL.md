---
name: story-refine
description: Audit an existing user story and fix it in place. Cohn+Gherkin canonical output. Asks clarifications ONLY in terminal. Recommends split when story has multiple outcomes.
trigger: "/story-refine | refine this story | improve this story | refinar historia | this story is incomplete"
intent: Refinement skill for stories that already exist but are incomplete or weakly specified. Default philosophy = Mike Cohn (story is a conversation starter, not a spec). Splits aggressively. Never produces mini-PRDs.
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

6. **Sibling task IDs.** If story body references "next task", "future task", "another story", "siblings" — check `<output-folder>/.storywright-context.json` first (rule 9). If unresolved, ask via `AskUserQuestion`. If user has none yet, leave a `TODO: link sibling` placeholder, do not invent (unless rule F applies — see below).

7. **Mockup chrome detection — closed list.** Chrome = exactly these elements:
   - left nav rail / sidebar
   - top bar (user menu, global breadcrumbs, global search)
   - footer
   - persistent toast/snackbar slot
   - persistent modal scrim
   - app-level tabs

   If companion image shows any of the above and the story body does not mention them, ask via `AskUserQuestion` whether each one is in-scope, sibling-scope, or out-of-scope. Anything not on this list (cards, section headers, in-flow buttons) is NOT chrome — do not surface as a chrome question.

8. **Anti-PRD is part of INVEST `Small`, not a separate step.** See `[[invest-checklist]]` step 7 — line count ceiling lives inside the `Small` criterion so there is one source of truth.

9. **Cross-skill context persistence.** When the skill resolves any clarification via `AskUserQuestion`, write the **answers** to `<output-folder>/.storywright-context.json`. This is NOT a question file — it is a resolved-answers file. Read only from the exact output folder of the current invocation; never search siblings or parents. Schema:
   ```json
   {
     "version": 1,
     "decided_at": "<ISO date>",
     "decided_by_skill": "story-refine",
     "language": "EN | ES | ...",
     "chrome_scope": "in-scope | in-scope-placeholder | sibling | out-of-scope",
     "siblings": "TODO | <list of IDs> | not-applicable",
     "design_source": "raster | figma | tokens",
     "naming_pattern": "<see rule F>",
     "extra": {}
   }
   ```
   Future skills (`story-split`, `story-from-figma`, etc.) MUST read this file before re-asking the same questions.

10. **Children independence — mechanical detection (A).** When the skill recommends or executes split, build an NxN dependency matrix MECHANICALLY, not by intuition:
    - For each child Cj, parse its `Given:` and `and Given:` lines.
    - If any `Given` text contains a surface noun owned by child Ci (e.g., Cj's Given mentions "the grid" and Ci's title/scope owns "grid") → mark `DEP(Cj → Ci)`.
    - The dependency map IS the union of those text matches. Do not add deps "you sense" without a Given citation.
    - Affected child's INVEST `Independent` becomes `PARTIAL · depends on <Ci>`; parent EPIC lists explicit build order derived from the matrix (topological).
    - Independence-by-intuition is forbidden. If a dep is real but no Given mentions it, rewrite the child's Given to make it explicit, then re-run the match.

11. **Per-child V audit (C).** After split, for each candidate child run a one-line V test: "If only this child ships and no sibling exists, does a real user complete a real task?". If the answer is "no, useless until <other child> ships" → mark V as `WEAK · merge-upstream-candidate` and recommend merging that child into its parent surface instead of keeping it standalone. Do not let stylistic/UI-fragment children survive the split.

12. **Passive-goal downstream prompt (G).** If the story's `I want to` verb is passive/observational (`view, see, read, browse, look at, inspect, monitor`) and the `so that` does not name a follow-up user action — ask once via `AskUserQuestion`: "What does the user do with this data?". Use the answer to strengthen the `so that` clause. This forces explicit value. Skip the prompt if `so that` already names a downstream action (e.g., "so that I can call the customer").

### 4a. Language auto-detect — expanded signals (E)

Run cheap detection before asking. Look at multiple signals, not just Gherkin keywords:

| Signal | Where to look | Weight |
|---|---|---|
| Gherkin keywords in M ("Given/When/Then") | AC block | high |
| Persona phrasing in M ("As a user" vs "Como un usuario") | Use Case | high |
| Column / field names in M ("Phone - primary", "Teléfono - principal") | AC bullets | medium |
| Domain verbs in M ("clicking" vs "hacer clic", "submitting" vs "enviar") | AC bullets | medium |
| Title language | header | low |

**Decision:**
- All high+medium signals agree on language M → adopt M silently. No question. Mark inline `⚠️ Assumed: output language = <M> (auto-detected from <signals>)`.
- Signals split (some EN, some ES) → ask once via `AskUserQuestion`.
- User-chat language = L, story-body signals = M, but high signals tie → prefer M (story body is contract).

Persist via rule 9.

### Rule F. Naming pattern — ask once, persist

When the skill needs to invent a tentative ticket slug (e.g., for sibling references with no IDs yet) AND `.storywright-context.json` has no `naming_pattern` field, ask once via `AskUserQuestion`:

```
Which naming pattern do you use for tickets?
- kebab-case feature-action       → "customer-search-bar-wire"
- verb-noun                        → "wire-search-bar"
- domain-action                    → "search.customer.wire-input"
- Jira prefix + numeric            → "CSB-001" (assume next available)
```

Persist the answer in `.storywright-context.json` under `naming_pattern`. Use it for all sibling slugs in the current run AND future skills reading the same context file.

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
- **so that** [outcome with downstream action — see rule G]

#### Preconditions (optional, only if user provided)
- ...

#### Out of Scope (optional, only if user provided)
- ...

#### Acceptance Criteria
- **Scenario:** [single-outcome scenario name]
- **Given:** [context — surface nouns here drive dep matrix per rule A]
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

2. **Read prior context.** If `<output-folder>/.storywright-context.json` exists (exact folder only — no sibling fallback), load it. Apply resolved answers; skip the corresponding questions.

3. **Language resolution (rule 4 + 4a).** Auto-detect using the expanded signal table. Ask only if signals split. Persist via rule 9.

4. **Passive-goal check (rule G).** If `I want to` verb is observational AND `so that` lacks downstream action → ask once. Persist resolution into the strengthened `so that` clause.

5. **Gap-check.** For each weak/missing section:
   - **Blocking** (changes scope, AC outcome, or persona) → `AskUserQuestion` immediately (batched ≤4).
   - **Non-blocking** (additive detail) → fill inline marked `⚠️ Assumed: <text>`. Do not ask.

6. **Sibling reference check (rule 6).** If found and unlinked → ask via `AskUserQuestion` once. If user opts for tentative slugs, apply rule F (naming pattern). Persist via rule 9.

7. **Deterministic pre-split test.** Apply this counter mechanically — do not eyeball:

   **Count = sum of all hits below:**
   | Signal | Hit value |
   |---|---|
   | AC bullet starting with an action verb at the user level ("clicking", "submitting", "entering", "navigating") | +1 each |
   | Distinct `When [event]` phrasing already implied in the story | +1 each |
   | Distinct named UI surface mentioned at the AC level — see (D) below for what counts | +1 each |

   **(D) Surface vs styling rule (deterministic).** A "named UI surface" counts as +1 ONLY if it has its own user goal — meaning there is a verb in the story body where the user *does something with that surface* (clicks it, navigates with it, reads it, configures it). If a noun is mentioned only in a styling context (color, background, padding, alignment) or as a sub-component of a parent surface (column inside a grid, label inside a button) → it is NOT a surface. It is styling. Count = 0.

   Examples:
   - "header row visually distinct (purple background)" — styling of grid → 0
   - "pagination control with page numbers and arrows" — surface with user goal (navigating) → +1
   - "5 columns: Code, Customer name, Phone, Email, Address" — columns are sub-components of grid → 0 (grid still counts once)
   - "results counter next to search button" — surface with user goal (reading count) → +1

   **Do NOT count:**
   - sub-bullets describing the same flow (column names inside one grid = the grid itself, not separate outcomes)
   - styling of an existing surface (header purple = part of grid, not a new outcome)
   - preconditions or "rendered" statements (passive layout assertions are not Whens)

   **Decision:**
   - Count ≤1 → continue to step 8.
   - Count ≥2 → **STOP. Recommend `/story-split` via terminal message.** Output: list of candidate children + per-pair dependency note (rule 10) + V audit per child (rule 11).

8. **Fill the weak sections** using `[[acceptance-criteria]]` (single Gherkin block) and `[[invest-checklist]]`. Preserve original wording where it was already good.

9. **Run INVEST** via `[[invest-checklist]]` (which embeds the anti-PRD line-count check inside `Small` — rule 8).
   - `READY` → render.
   - `SPLIT RECOMMENDED` → STOP, recommend split (and run rule 10 children-independence matrix + rule 11 V audit per child).
   - `NEEDS REFINEMENT` → iterate failing dimension, max 1 cycle, then STOP.
   - `NOT A STORY` → tell user it's a tech task and stop.

10. **Render** both outputs via `[[jira-wiki-formatter]]`. Files: `story.standard.md` + `story.jira-wiki.md`. Plus `.storywright-context.json`. No other files.

11. **Refinement log** ≤3 bullets (≤5 if SPLIT) appended at story end.

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
Matriz independencia (parse mecánico de Given):
- C4.Given menciona "the grid" → DEP(C4 → C2) → PARTIAL
- C5.Given menciona "the grid" → DEP(C5 → C2) → PARTIAL
- Orden build: C1 → C2 → {C3, C4, C5}
V audit per child:
- C1: PASS (chrome funcional = workspace context)
- C2: PASS (read records)
- C3: WEAK · merge-upstream-candidate — counter sin grid no entrega valor
- C4: PASS (navigate pages)
- C5: PASS (link affordance)
Corré /story-split para expandir; considera mergear C3 en C2.
```

### Good — passive-goal prompt fires
Input: "As a user, I want to view list of customers, so that I quickly find details."
Skill detects passive verb `view` + thin `so that`.
Asks: "What does the user do with the customer they find?"
User: "Call them to schedule a service."
Refined `so that`: "so that I can quickly find a customer and call them to schedule a service."

### Bad
Adding NFR / a11y / i18n / Dependencies sections "to be thorough". Violates rule 3.

### Bad
Writing any sidecar question file instead of asking via `AskUserQuestion`. Violates rule 1.

### Bad
Tagging every visual claim with `[mockup-pixel-derived]` instead of using the single banner. Violates rule 5.

### Bad
Claiming 5 children all `Independent` after split without running the mechanical matrix from rule 10.

### Bad
Counting "header row purple" as +1 in the pre-split test. It is styling of the grid (rule D), not a separate surface. Should be 0.

## Common Pitfalls

- Treating refine like generate. If the PM already wrote the user goal, don't restate it.
- Renumbering ACs — append new content, don't shuffle.
- Skipping the deterministic pre-split test (step 7). Refining oversized stories produces oversized refined stories.
- Eyeballing outcome counts or dep matrix instead of running the mechanical rules (D, A).
- Re-asking questions already answered in `.storywright-context.json`.
- Letting weak-V children survive the split (rule 11).
- Skipping the downstream-action prompt for passive goals (rule G).

## References

- [[story-generate]]
- [[story-split]]
- [[invest-checklist]]
- [[acceptance-criteria]]

<claude-specific>
- Diff the original sections against the refined ones in your reasoning; only emit changes that materially improve the story.
- Never call Write for any question/clarification sidecar file. Use `AskUserQuestion`.
- Treat step 7 (deterministic pre-split test) as a hard gate; do not skip even when the user explicitly asks to refine.
- Read `.storywright-context.json` ONLY from the exact target output folder. Do not search siblings or parents.
- After split, build the dependency matrix from Given-text parsing (rule 10), not intuition.
- After split, run V audit per child (rule 11) and flag merge-upstream-candidates loudly.
- For passive `I want to` verbs, fire rule G prompt before INVEST.
</claude-specific>

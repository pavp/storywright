---
name: story-split
description: Split an oversize story into an epic plus Cohn+Gherkin children. Mechanical NxN dep matrix and per-child V audit. Asks ONLY in terminal. Never auto-splits.
trigger: "/story-split | split this story | divide this story | dividir historia | this is too big"
intent: Splitting skill driven by INVEST failure reasons. Produces an epic plus N child story stubs in the v2.2 canonical Cohn+Gherkin shape, with mechanical dependency matrix and Valuable audit per child.
version: 2.2.0
inputs:
  - text
  - image
  - figma-link
outputs:
  - epic.md
  - story-1.md
  - story-2.md
  - .storywright-context.json
composes:
  - _components/invest-checklist
  - _components/clarification-questions
  - _components/acceptance-criteria
  - _components/jira-wiki-formatter
---

## Purpose

When a story is an epic in disguise, splitting badly is worse than not splitting. This skill uses established INVEST-compatible patterns to propose a clean decomposition, then mechanically verifies each child's independence and value before saving. The user always approves the plan before any child is written.

## Hard rules (v2.2 parity with refine/generate)

1. **Terminal-only clarifications.** Never write any sidecar question file. All gap questions through `AskUserQuestion`, batched ≤4. Non-blocking gaps → `⚠️ Assumed` inline.

2. **Children are Cohn+Gherkin canonical.** Each child has ONE Use Case block + ONE AC scenario (one Given chain + one `When` + one `Then`). If a child still needs >1 `When`/`Then` → recursive re-split.

3. **No mini-PRDs in children.** Same prohibition list as refine v2.2 — no NFR blocks, no Edge Cases enumerations, no Dependencies prose, no per-claim visual specs, refinement logs ≤3 lines (≤5 if recursive split).

4. **Output language matches the user's chat language.** Auto-detect via rule 4a; ask only if signals split. Persist via rule 9.

5. **Visual inference confidence — single banner only** in each child's Design Reference block. No per-claim `[mockup-pixel-derived]` tags.

6. **Sibling task IDs.** When referencing tickets that don't exist yet, follow rule F (naming pattern) instead of inventing slugs.

7. **Chrome detection — closed list** (nav rail, top bar, footer, toast slot, modal scrim, app tabs). If image shows chrome and the input doesn't mention it, ask whether to add as its own child, attach to an existing child, or scope out.

8. **Anti-PRD is part of each child's INVEST `Small` criterion** — see `[[invest-checklist]]` Small.

9. **Cross-skill context persistence.** Read `<output-folder>/.storywright-context.json` first (exact folder only). Write updated answers back at the end. Schema:
   ```json
   {
     "version": 1,
     "decided_at": "<ISO date>",
     "decided_by_skill": "story-split",
     "language": "EN | ES | ...",
     "chrome_scope": "in-scope | in-scope-placeholder | sibling | out-of-scope",
     "siblings": "TODO | <list of IDs> | not-applicable",
     "design_source": "raster | figma | tokens",
     "naming_pattern": "<see rule F>",
     "extra": { "split_pattern": "...", "core_complexity": "..." }
   }
   ```

10. **Children independence — mechanical detection (A).** For each child Cj, parse its `Given:` lines for surface nouns owned by sibling Ci. If matched → `DEP(Cj → Ci)`. The dependency matrix IS the union of those matches. No intuition-based deps. Affected child's INVEST `Independent` becomes `PARTIAL · depends on <Ci>`. Build order in epic.md is a topological sort of the matrix.

11. **Per-child V audit (C).** For each candidate child, run one-line test: "If only this child ships and no sibling exists, does a real user complete a real task?". If answer is "no, useless until <other> ships" → mark V = `WEAK · merge-upstream-candidate` and recommend merging into the parent surface. Do not let stylistic/UI-fragment children survive the split.

12. **Passive-goal downstream prompt (G).** If any child's `I want to` verb is observational (view/see/read/browse/look/inspect/monitor) AND `so that` lacks a follow-up action → ask once via `AskUserQuestion` per child (batched ≤4 across children).

13. **Determinism on counts.** Use the same deterministic surface-vs-styling counter (rule D from refine v2.2) inside child re-split checks.

### 4a. Language auto-detect — expanded signals (E)
Same weighted signal table as refine v2.2 (Gherkin keywords, persona phrasing, column names, domain verbs, title). Adopt silently when high+medium signals agree; ask only if split.

### Rule F. Naming pattern — ask once, persist
Same kebab / verb-noun / domain-action / Jira-prefix options. Persist in `naming_pattern`. Reuse across this run AND future skills.

### Rule D. Surface vs styling (deterministic)
A noun counts as a separate surface ONLY if it has its own user goal (verb). Styling, sub-components, and passive layout assertions do not count.

## When to use

- `[[invest-checklist]]` returned `SPLIT RECOMMENDED` (I, E, or S fail).
- User explicitly asks: "this story is too big, split it".
- `[[story-refine]]` or `[[story-generate]]` deterministic pre-split test ≥2.

## Inputs & interpretation

- **text** — the oversize story (or epic-scoped one-liner).
- **image (optional)** — companion mockup. Use to validate scope and reveal hidden sub-flows.
- **figma-link (optional)** — companion design. Prototype links / frame structure reveal natural flow boundaries.

### Mixed inputs source-priority

- Text canonical for `User Story / Scope / Business Goal` of the epic.
- Figma / image canonical for `flow structure / candidate children`.
- Conflicts → BLOCKING `AskUserQuestion`. Never silently expand or shrink scope.

## Pre-split gate (STOP conditions)

Run `[[invest-checklist]]` first:

- **V FAILS** → STOP. Not a story. Combine with related user-facing work. Do not split.
- **T FAILS** → fix in place via `[[story-refine]]`. Splitting untestable input produces untestable children.
- **N FAILS** → fix in place. Story is over-prescriptive, not too big.
- **E FAILS due to unknowns** → recommend a spike, not a split.
- **I / E (size) / S FAIL** → proceed to pattern selection.

## Pattern catalog (apply in order; stop at first that fits)

Humanizing Work methodology (Lawrence & Green).

1. **Workflow steps — thin end-to-end slices.** NOT step1/step2 of the journey. Each child delivers the FULL workflow with increasing sophistication.
   - ❌ Wrong: editorial / legal / publish. Story 1 alone delivers nothing.
   - ✅ Right: publish immediately. Story 2 adds editorial. Story 3 adds legal.
2. **CRUD operations.** "Manage" / "handle" / "maintain" → split into C/R/U/D.
3. **Business rule variations.** Same feature, different rules (members / VIP / first-time).
4. **Data type variations.** One story per data shape (jpg / pdf / mp4).
5. **Data entry / UI complexity.** Basic input first; fancy UI (calendar, autocomplete) as follow-ups.
6. **Major effort.** First implementation does the heavy infrastructure lift; subsequent stories are trivial additions.
7. **Simple / complex.** Strip variations from the core. Story 1 = simplest case that still delivers value.
8. **Defer performance.** Make-it-work before make-it-fast.
9. **Spike (last resort).** Time-boxed investigation. Not a story.

**Anti-patterns (NOT splits):**
- Horizontal slicing (frontend / backend) — no user value per child.
- Task decomposition ("set up DB", "write endpoint").
- Meaningless halves.

## Cynefin domain calibration

- **Obvious / Complicated** — enumerate all children, prioritize by value/risk.
- **Complex** — produce 1–2 learning stories that ship something observable; let usage teach the rest.
- **Chaotic** — defer splitting; stabilize first.

## Meta-pattern (every pattern)

1. Name the **core complexity** that makes the story big.
2. List **all variations** of that complexity.
3. Pick **one variation** as the simplest complete vertical slice.
4. Each other variation becomes its own story.

## Application (step-by-step)

0. **Read prior context.** Load `<output-folder>/.storywright-context.json` if present (exact folder only). Apply resolved answers.

1. **Detect input types + companion sources.** Run conflict detection (mixed inputs). Run chrome detection (rule 7).

2. **Language resolution** via rule 4a.

3. **Pre-split gate.** Run `[[invest-checklist]]`. Honor STOP conditions above.

4. **Pattern selection.** Apply catalog in order. Name first fit. Name the meta-pattern's "core complexity". Note Cynefin domain.

5. **Draft split plan** as a terminal table (no file yet):

   ```
   ### Split Plan
   Rationale: <INVEST failure reasons>
   Core complexity: <meta-pattern>
   Pattern(s): <names>
   Cynefin: <domain>

   | # | Proposed child | Pattern | V audit (rule 11) |
   |---|---|---|---|
   | 1 | ... | Workflow simple | PASS / WEAK·merge |
   | 2 | ... | Data variation | PASS |
   ```

6. **Strategic check before approval:**
   - Does the split reveal low-value work we can deprioritize or kill?
   - Are the children roughly equal in size?
   If neither holds, try a different pattern.

7. **STOP and ask the user to approve via `AskUserQuestion`:**
   - Approve → proceed to step 8.
   - Adjust → edit, re-loop.
   - Cancel → mark original as `NEEDS REFINEMENT`, stop.

8. **For each approved child, write the canonical block** (Use Case + AC + Design Ref + INVEST):

   ```markdown
   ### [Child Title]

   #### Use Case
   - **As a** [persona]
   - **I want to** [action]
   - **so that** [outcome — rule G applied]

   #### Acceptance Criteria
   - **Scenario:** [single outcome]
   - **Given:** [context — surface nouns drive dep matrix]
   - **When:** [single trigger]
   - **Then:** [single observable outcome]

   #### Design Reference (optional)
   **Source: <raster | figma | tokens> → <banner from rule 5>**
   - [link / path]

   #### INVEST
   - I — <PASS | PARTIAL · depends on <Ci>>
   - N/V/E/S/T — one line each
   - **Verdict:** READY | READY (after <Ci> builds) | WEAK·merge-upstream-candidate

   #### Refinement log (≤3 lines)
   - Split from parent; pattern: <name>.
   ```

9. **Build the dependency matrix mechanically (rule 10).** Parse each child's `Given` lines for surface nouns owned by other children. Emit the matrix in `epic.md`.

10. **Run V audit per child (rule 11).** Flag merge-upstream candidates in `epic.md`. Recommend merging instead of keeping standalone.

11. **Recursive re-split check.** For each child, run the deterministic counter (rule D). If count ≥2 for any child → recursive split of that child. Surface the tree in `epic.md`.

12. **Coherence check** — verify children together cover the original scope. Flag gaps or overlaps before saving.

13. **Write `epic.md`** at `<output-folder>/`:

    ```markdown
    ### EPIC: <title>

    **Why split:** <pattern + core complexity + INVEST failure reasons>

    **Cynefin domain:** <domain>

    **Children independence matrix (mechanical, rule 10):**

    |        | C1 | C2 | C3 | ... |
    |--------|----|----|----|-----|
    | C1     | —  |    |    |     |
    | C2     |DEP | —  |    |     |
    | ...    |    |    |    |     |

    **Build order (topological):** C1 → C2 → ...

    **V audit (rule 11):**
    - C1 — PASS
    - C2 — PASS
    - C3 — WEAK · merge-upstream-candidate (merge into C2)

    **Children:**
    1. story-1.md — <slug per naming pattern F>
    2. story-2.md
    ...

    **Design source:** <raster | figma | tokens>
    ```

14. **Write all `story-N.md` files** and `.storywright-context.json` updated with `split_pattern` and `core_complexity` under `extra`.

## Validate every child (must pass all 6)

1. Delivers user value independently (rule 11 V audit PASS).
2. Developable with explicit build order from the matrix (no implicit deps).
3. Testable: single Given/When/Then with observable outcome.
4. Sprintable (1–5 days work).
5. Union equals original scope (coherence check).
6. ≤60 lines per child story (anti-PRD via INVEST Small).

A "no" on any line → revise the split.

## Examples

### Good
Original: "Permitir login con Google" with INVEST Small + Estimable FAIL.
Split:
1. Web — new accounts only (Simple)
2. Mobile — new accounts only (Simple)
3. Account linking with existing email/password (Major effort)
4. Workspace domain restriction (Business rule variation)

Matrix mechanical:
- C2.Given mentions "Google sign-in handshake" owned by C1 → DEP(C2 → C1)
- C3.Given mentions "Google account exists" owned by C1 → DEP(C3 → C1)
- C4 independent.

V audit: all PASS.

Build order: C1 → {C2, C3} → C4 (C4 parallel anytime).

### Good — merge recommendation
Original story produced child "results counter" + child "grid". Counter's V audit:
- "If only counter ships and no grid exists, does a user complete a task?" → no.
- V = WEAK · merge-upstream-candidate.
- Epic recommends merging counter into grid child.

### Bad
Splitting "Permitir login con Google" into "Backend auth endpoint" + "Frontend login button". Task split, not story split. Both fail rule 11.

### Bad
Claiming all 5 children Independent without running rule 10 matrix.

### Bad
Writing any sidecar question file. Violates rule 1.

## Common Pitfalls

- Skipping the INVEST pre-split gate. Splitting non-V or non-T input.
- Workflow split done step-by-step instead of thin end-to-end.
- Horizontal slicing (frontend / backend / DB).
- Task splits.
- Splitting on size alone without naming pattern or core complexity.
- Forcing a pattern that doesn't fit.
- Auto-splitting without user approval.
- Skipping the mechanical matrix (rule 10).
- Skipping per-child V audit (rule 11).
- Letting tree go >5 children — that's an initiative, not an epic.
- Splitting in Chaotic Cynefin — stabilize first.
- Re-asking questions already in `.storywright-context.json`.

## References

- [[invest-checklist]]
- [[story-generate]]
- [[story-refine]]
- [[clarification-questions]]

<claude-specific>
- Use extended thinking for pattern selection (compare options explicitly).
- Cache the 9-pattern catalog and the v2.2 hard-rule list.
- Build the dependency matrix from Given-text parsing (rule 10), not intuition.
- Run V audit per child (rule 11) and flag merge candidates loudly.
- Never call Write for any sidecar question file. Use `AskUserQuestion`.
- Read `.storywright-context.json` ONLY from the exact target output folder.
</claude-specific>

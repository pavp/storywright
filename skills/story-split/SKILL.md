---
name: story-split
description: Split an oversize story into an epic plus Cohn+Gherkin children. Mechanical NxN dep matrix and per-child V audit. Inherits all hard rules from storywright-base.
trigger: "/story-split | split this story | divide this story | dividir historia | this is too big"
intent: Splitting skill driven by INVEST failure reasons. Behavior 100% identical to siblings except for source (oversize story) and split-behavior (ALWAYS produces epic + N children, never a single story).
version: 2.3.0
inputs:
  - text
  - image
outputs:
  - epic.md
  - story-1.standard.md
  - story-1.dev.md
  - story-2.standard.md
  - story-2.dev.md
  - .storywright-context.json
composes:
  - _components/storywright-base
  - _components/invest-checklist
  - _components/clarification-questions
  - _components/business-rules
  - _components/acceptance-criteria
  - _components/edge-cases
  - _components/analytics-events
  - _components/risks-and-dependencies
  - _components/definition-of-done
  - _components/story-formatter
  - _components/estimation
---

## Purpose

When a story is an epic in disguise, splitting badly is worse than not splitting. This skill uses established INVEST-compatible patterns to propose a clean decomposition, then mechanically verifies each child's independence and value before saving.

**All hard rules, canonical output shape, language detection, terminal-only Q, mechanical NxN dep matrix, per-child V audit, context persistence, and INVEST handling live in `[[storywright-base]]`. Read that first. Anything in this file is a SOURCE-SPECIFIC or SPLIT-BEHAVIOR delta only.**

## Source-specific differential

- **Source:** an oversize story (any prior source — generate / refine / batch may all hand off here). The story has failed INVEST on I, E, or S — OR the deterministic pre-split count is ≥2.
- **What changes vs base:** the skill does NOT produce a single story. It ALWAYS produces an epic + N children. Each child obeys the base canonical block. The user must approve the split plan before children are written.

## Split behavior differential

This skill IS the split behavior. It always emits multiple files:
- `epic.md` — title, why-split, INVEST failure reasons, mechanical NxN matrix, build order, V audit per child, list of children. Single file (epic metadata, not a user story).
- Per child: both files `story-<N>.standard.md` + `story-<N>.dev.md`, rendered via `[[story-formatter]]` — same contract as every other story-producing skill. Each child is a canonical user story (per base shape).
- `.storywright-context.json` — persisted answers.

NO `split-plan.md`. The plan lives inside `epic.md`.

### Pre-split gate (STOP conditions) — run BEFORE pattern selection

Run `[[invest-checklist]]` first:
- **V FAILS** → STOP. Not a story. Combine with related user-facing work.
- **T FAILS** → fix in place via `[[story-refine]]`.
- **N FAILS** → fix in place. Story is over-prescriptive, not too big.
- **E FAILS due to unknowns** → recommend a spike, not a split.
- **I / E (size) / S FAIL** → proceed to pattern selection.

### Pattern catalog (apply in order; stop at first that fits)

Humanizing Work methodology (Lawrence & Green).

1. **Workflow steps — thin end-to-end slices.** Each child delivers the FULL workflow with increasing sophistication. NOT step1/step2 of the journey.
   - ❌ Wrong: editorial / legal / publish.
   - ✅ Right: publish immediately. Story 2 adds editorial. Story 3 adds legal.
2. **CRUD operations.** "Manage" / "handle" / "maintain" → C/R/U/D.
3. **Business rule variations.** Same feature, different rules (members / VIP / first-time).
4. **Data type variations.** One story per data shape (jpg / pdf / mp4).
5. **Data entry / UI complexity.** Basic input first; fancy UI as follow-ups.
6. **Major effort.** First implementation does the heavy infrastructure lift.
7. **Simple / complex.** Strip variations from the core. Story 1 = simplest case that still delivers value.
8. **Defer performance.** Make-it-work before make-it-fast.
9. **Spike (last resort).** Time-boxed investigation. Not a story.

**Anti-patterns (NOT splits):** horizontal slicing (FE/BE), task decomposition, meaningless halves.

### Cynefin domain calibration

- **Obvious / Complicated** — enumerate all children, prioritize by value/risk.
- **Complex** — produce 1–2 learning stories; let usage teach the rest.
- **Chaotic** — defer splitting; stabilize first.

### Meta-pattern (every pattern)

1. Name the **core complexity** that makes the story big.
2. List **all variations** of that complexity.
3. Pick **one variation** as the simplest complete vertical slice.
4. Each other variation becomes its own story.

## Application (step-by-step)

Follow the **base Application** skeleton for the front-end behaviors (context load, language, persona, passive-goal, gap-check, siblings). Split-specific steps inserted after:

1. **Pre-split gate.** Run `[[invest-checklist]]`. Honor STOP conditions above.

2. **Pattern selection.** Apply catalog in order. Name first fit + core complexity + Cynefin domain.

3. **Draft split plan** as a terminal table (no file yet):
   ```
   ### Split Plan
   Rationale: <INVEST failure reasons>
   Core complexity: <meta-pattern>
   Pattern(s): <names>
   Cynefin: <domain>

   | # | Proposed child | Pattern | V audit (base rule 11) |
   |---|---|---|---|
   ```

4. **Strategic check before approval:**
   - Does the split reveal low-value work we can deprioritize?
   - Are children roughly equal in size?

5. **STOP and ask the user to approve via `AskUserQuestion`.**

6. **For each approved child, write the base canonical block, then render via `[[story-formatter]]` to both files** (`story-<N>.standard.md` + `story-<N>.dev.md`). The child's enrichment (edge cases, risks, analytics) populates its `story-<N>.dev.md` per base step 8b.

7. **Build dependency matrix mechanically (base rule 10).** Render in `epic.md`.

8. **V audit per child (base rule 11).** Flag merge-upstream candidates in `epic.md`.

9. **Recursive re-split check.** For each child, run the base deterministic counter. If count ≥2 → recursive split of that child. Surface the tree in `epic.md`.

10. **Coherence check** — children together cover the original scope. Flag gaps or overlaps.

11. **Write `epic.md`** with: why-split, Cynefin, matrix, build order, V audit, list of children.

12. **Persist context** to `.storywright-context.json` (`extra.split_pattern`, `extra.core_complexity`).

## Validate every child (must pass all 6)

1. Delivers user value independently (V audit PASS).
2. Developable with explicit build order from the matrix.
3. Testable: single Given/When/Then with observable outcome.
4. Sprintable (1–5 days).
5. Union equals original scope.
6. ≤60 lines per child story (anti-PRD via base rule 8).

## Examples

### Good
Original: "Permitir login con Google" — INVEST Small + Estimable FAIL.
Children:
1. Web — new accounts only (Simple)
2. Mobile — new accounts only (Simple)
3. Account linking with existing email/password (Major effort)
4. Workspace domain restriction (Business rule variation)

Matrix mechanical:
- C2.Given mentions "Google sign-in handshake" owned by C1 → DEP(C2 → C1)
- C3.Given mentions "Google account exists" owned by C1 → DEP(C3 → C1)
- C4 independent.

V audit: all PASS. Build order: C1 → {C2, C3} → C4.

### Good — merge recommendation
"Results counter" child V audit:
- "If only counter ships, no grid, does a user complete a task?" → no.
- V = WEAK · merge-upstream-candidate. Recommend merging into the grid child.

### Bad
Splitting into "Backend auth endpoint" + "Frontend login button". Task split, no user value per child. Fails base rule 11.

### Bad
Claiming children Independent without running the mechanical matrix (base rule 10).

## Common Pitfalls (split-specific)

- Skipping the pre-split INVEST gate.
- Workflow split done step-by-step instead of thin end-to-end.
- Horizontal slicing (FE/BE/DB).
- Task splits.
- Splitting on size alone without naming a pattern or core complexity.
- Auto-splitting without user approval.
- Letting the tree go >5 children — that's an initiative, not an epic.
- Splitting in Chaotic Cynefin — stabilize first.
- All other pitfalls in `[[storywright-base]]` apply equally.

## References

- [[storywright-base]] — the rulebook
- [[invest-checklist]]
- [[story-generate]]
- [[story-refine]]
- [[story-batch]]

<claude-specific>
- Read `[[storywright-base]]` before applying. Do not duplicate its rules in your reasoning.
- Use extended thinking for pattern selection (compare options explicitly).
- Cache the 9-pattern catalog.
- Build the dependency matrix from Given-text parsing (base rule 10), not intuition.
</claude-specific>

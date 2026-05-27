---
name: story-split
description: Detect when a story is too big to ship in one sprint and propose an INVEST-driven split into an epic with sub-stories. Never auto-splits — always proposes, then waits for user confirmation.
trigger: "/story-split | split this story | divide this story | dividir historia | this is too big"
intent: Splitting skill that uses the INVEST failure reasons (from invest-checklist) as the rationale for decomposition. Produces an epic skeleton plus N child story stubs, ready to feed back into story-generate.
version: 1.0.0
inputs:
  - text
outputs:
  - split-plan.md
  - epic.md
  - story-1.md, story-2.md, ... (N child stubs)
composes:
  - _components/invest-checklist
  - _components/clarification-questions
---

## Purpose

When a story is an epic in disguise, splitting badly is worse than not splitting. This skill uses **established INVEST-compatible patterns** (workflow steps, business rules, user roles, data variations, happy/sad paths, simple/complex) to propose a clean decomposition. The user always approves the plan before any child stories are written.

## When to use

- `[[invest-checklist]]` returned `SPLIT RECOMMENDED` (failures on I, E, or S).
- User explicitly asks: "this story is too big, split it".
- Input visibly mixes ≥2 flows.

## Inputs & interpretation

- **text** — the oversize story (or a one-line goal that's clearly epic-scoped).

## Application (step-by-step)

### Pre-split gate — STOP conditions

Before splitting anything, run `[[invest-checklist]]` and apply these gates:

- **Valuable FAILS** → **STOP. Do not split.** A non-valuable item is a technical task, not a story. Combine it with related user-facing work; don't decompose it.
- **Testable FAILS** → **fix in place** via `[[story-refine]]` first. Splitting an untestable story produces untestable children.
- **Negotiable FAILS** → fix in place; the story is over-prescriptive, not too big.
- **Estimable FAILS due to unknowns** → run a **spike** (Pattern 9 below), not a split.
- **Independent / Estimable / Small FAIL** → continue to pattern selection.

### Pattern catalog (apply in order; stop at first that fits)

Based on the Humanizing Work splitting methodology (Richard Lawrence & Peter Green).

1. **Workflow steps — thin end-to-end slices.**
   **Critical:** this is NOT "step 1 / step 2 / step 3" of the journey. Each child must deliver the **full** workflow with increasing sophistication.
   - ❌ Wrong: Story 1 = editorial review, Story 2 = legal approval, Story 3 = publish. (Story 1 alone delivers nothing observable to the user.)
   - ✅ Right: Story 1 = publish post immediately, no reviews. Story 2 = add editorial review step. Story 3 = add legal step. Each story produces visible behavior.

2. **CRUD operations.** When the input says "manage" / "handle" / "maintain", it bundles operations. Split into Create / Read / Update / Delete.

3. **Business rule variations.** Same feature, different rules → one story per rule (members / VIP / first-time discounts).

4. **Data type variations.** One story per data shape (counties / cities / custom areas; or jpg / pdf / mp4). Deliver simplest first.

5. **Data entry / UI complexity.** Basic input first (`YYYY-MM-DD` text); fancy UI (calendar picker, autocomplete, drag-drop) as follow-ups.

6. **Major effort.** First implementation does the heavy infrastructure lift; subsequent stories are trivial additions (build Visa payments + infra in story 1; add Mastercard/Amex in story 2).

7. **Simple / complex.** Strip variations from the core. Story 1 = simplest case that still delivers value; stories 2..N = each variation.

8. **Defer performance.** "Make it work" before "make it fast". Story 1 = functional, no SLA. Story 2 = optimize to <100ms / add caching / scale.

9. **Spike (last resort).** None of 1–8 apply because the unknown blocks decomposition. Run a 1–2 day time-boxed investigation answering a specific question ("is this feasible on our stack?", "what does the third-party API actually return?"). A spike is **not a story** — it produces learning, not shippable code. After the spike, restart at pattern 1.

**Anti-patterns (these are NOT splits):**
- Horizontal slicing (frontend story + backend story) — neither child has user value.
- Task decomposition ("set up DB" / "write endpoint" / "build form").
- Meaningless halves ("first half of feature" / "second half").

### Cynefin domain calibration

Adjust the splitting strategy to uncertainty:

- **Obvious / Complicated** — known problem, just engineering. Enumerate all children, prioritize by value/risk.
- **Complex** — unclear what users want or what will work. Don't enumerate exhaustively; produce **1–2 learning stories** that ship something observable, then let real usage teach what to write next.
- **Chaotic** — priorities shifting daily, fires burning. **Defer splitting** until stability returns. Stabilize first.

### Meta-pattern (applies across every pattern)

For any pattern you pick:
1. Name the **core complexity** that makes the story big.
2. List **all variations** of that complexity.
3. Pick **one variation** as the simplest complete vertical slice.
4. Each other variation becomes its own story.

### Procedure

1. Run `[[invest-checklist]]` and apply the pre-split gates above. If you should not split, say so explicitly and stop.
2. Apply the pattern catalog in order. Name the first pattern that fits and the meta-pattern's "core complexity".
3. **Draft a split plan** as a Markdown table:
   ```
   ### Split Plan

   **Rationale (from INVEST failure):**
   - S — FAIL: covers web + mobile + account-linking
   - E — FAIL: account-linking edge cases not scoped

   **Core complexity (meta-pattern):** authenticating new users + reconciling them with pre-existing accounts.
   **Pattern(s) applied:** Workflow steps (thin end-to-end) + Simple→Complex
   **Cynefin domain:** Complicated (known problem, just engineering)

   | # | Proposed child story | Pattern | INVEST hint |
   |---|---|---|---|
   | 1 | Login Google — simplest path (new account, web) | Workflow / Simple | Smallest complete vertical slice |
   | 2 | Login Google — mobile | Data variation (surface) | Small, depends on #1 |
   | 3 | Account linking — Google ↔ existing email/password | Major effort | Independent flow |
   | 4 | Workspace domain restriction | Business rule variation | Independent |

   **Proposed epic title:** Login con Google (multi-surface + linking)
   ```
4. **Split evaluation (strategic check before approval).** Ask:
   - **Does the split reveal low-value work we can deprioritize or kill?** Good splits surface 80/20 — e.g., after splitting flight search, "flexible dates" turns out to be rarely used → drop it.
   - **Are the children roughly equal in size?** Equal-sized children give PMs prioritization flexibility mid-sprint.
   If neither holds, try a different pattern.
5. **STOP and ask the user to approve the plan.** Options:
   - "Approve plan" → proceed to step 6
   - "Adjust" → user edits the table or merges/splits rows
   - "Cancel" → leave the story unsplit (mark it as `NEEDS REFINEMENT` for the team to negotiate)
6. **After approval:**
   - Write `epic.md` — title, description, child story list, business goal, dependencies between children
   - Write one stub per child: title + 1-line user story + open clarifications. **Do not run the full story-generate flow yet** — stubs are placeholders; user invokes `[[story-generate]]` per child when ready.
7. **Coherence check** — verify the children together cover the original scope. If any child overlaps another or the union has gaps, flag it before saving.
8. **Recursive re-split check.** For each child, ask: still >1 sprint? If yes, restart at the pattern catalog **for that child**. Keep splitting until every leaf is sprint-shippable. Surface the tree visually in the plan.
9. **Save all artifacts** under `./stories/<epic-slug>/`:
   - `epic.md`
   - `story-1.md`, `story-2.md`, …
   - `split-plan.md` (the decision trail)

## Examples

### Good

Original: "Permitir login con Google" with INVEST failing on Small + Estimable.

Split:
1. Web — new accounts only (Simple)
2. Mobile — new accounts only (Simple)
3. Account linking with existing email/password (Complex, depends on #1)
4. Workspace domain restriction (Independent rule)

Each child is shippable in one sprint, each has clear value, each is testable.

### Bad

Splitting "Permitir login con Google" into "Backend auth endpoint" and "Frontend login button" — that's a **task split**, not a story split. Both halves have no user value alone.

## Validate every child (must pass all 5)

1. **Delivers user value** independently? (not just "frontend done")
2. **Developable in isolation** with no hard ordering dependency?
3. **Testable** with concrete ACs?
4. **Sprintable** (1–5 days of work, single sprint)?
5. **Union equals original** — together do they cover the original scope?

A "no" on any line means revise the split.

## Common Pitfalls

- **Skipping the pre-split INVEST gate.** Splitting a non-Valuable item produces non-Valuable children. Splitting an untestable item produces untestable children. Fix first, split second.
- **Workflow done step-by-step instead of thin end-to-end.** Story 1 = "review" / Story 2 = "approve" / Story 3 = "publish" means Story 1 alone is invisible to the user. Each child must deliver visible behavior.
- **Horizontal slicing** (frontend / backend / DB). Each child must have user value.
- **Task splits** ("set up DB", "wire API to button"). Tasks aren't stories.
- **Splitting on size alone**, without naming the core complexity or pattern.
- **Forcing a pattern that doesn't fit.** If pattern N doesn't apply, say no and move on; never bend.
- **Auto-splitting without user approval.**
- **Forgetting the coherence check** — losing scope in the split.
- **Skipping the strategic evaluation** (low-value reveal, equal sizing).
- **Letting the tree go >5 children** — that's an initiative, not an epic.
- **Splitting in chaos.** Stabilize first; splitting amid shifting priorities just multiplies churn.

## References

- [[invest-checklist]]
- [[story-generate]]
- [[clarification-questions]]

<claude-specific>
- Use extended thinking — pattern selection benefits from explicit comparison of options.
- Cache the 8-pattern catalog.
</claude-specific>

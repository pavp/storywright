---
name: story-batch
description: Generate N Cohn+Gherkin stories from one multi-item backlog in a single pass. One story per item, shared clarification round when cohesive. Inherits all hard rules from storywright-base.
trigger: "/story-batch | story batch | batch backlog | generate backlog | multiple stories at once | generar backlog | varias historias"
intent: Batch entrypoint; behavior identical to siblings except source (one raw multi-item backlog) and split-behavior (one story per item; cohesive→shared clarification round, disparate→per-item; any item pre-split count ≥2→SPLIT RECOMMENDED+continue, never auto-split).
version: 1.0.0
inputs:
  - backlog-text
outputs:
  - story-1.standard.md
  - story-1.dev.md
  - backlog-summary.md
  - .storywright-context.json
composes:
  - _components/storywright-base
  - _components/clarification-questions
  - _components/business-rules
  - _components/acceptance-criteria
  - _components/edge-cases
  - _components/analytics-events
  - _components/risks-and-dependencies
  - _components/definition-of-done
  - _components/invest-checklist
  - _components/story-formatter
  - _components/estimation
---

## Purpose

A backlog input usually contains N discrete items — different features, improvements, or requirements listed together. This skill maps that multi-item input into Cohn+Gherkin stories — **one story per item, processed in a single invocation**. Each story emits two files: `story-N.standard.md` (PM-facing) + `story-N.dev.md` (dev-facing).

**All hard rules, canonical output shape, language detection, terminal-only Q, mechanical NxN dep matrix, per-child V audit, context persistence, and INVEST handling live in `[[storywright-base]]`. Read that first. Anything in this file is a SOURCE-SPECIFIC or SPLIT-BEHAVIOR delta only.**

## Source-specific differential

- **Source:** one raw multi-item backlog (numbered list, bulleted list, blank-line-separated blocks, or prose with multiple goals).
- **What changes vs base:**
  - **Input is N items, not one item.** Structural parsing identifies item boundaries first; LLM fallback infers boundaries when structural signals are absent or ambiguous.
  - **Boundary confirmation is mandatory.** The skill presents the parsed item list and waits for user confirmation before proceeding (non-skippable).
  - **Cohesion gate runs before clarifications.** Items sharing persona or feature-area context are processed with a single shared clarification round; disparate items get per-item clarifications.
  - **Output uses story-N.* prefix** so all items share one flat batch folder without collisions.
  - **backlog-summary.md is the batch roll-up.** Carries INVEST verdicts, dep matrix, V audit, build order, cohesion verdict, and SPLIT RECOMMENDED markers across all items.

## Split behavior differential

This skill produces **multiple stories in one invocation** (one per confirmed item). When N>1:
- **MANDATORY: emit `backlog-summary.md`** with:
  - Cohesion verdict and percentage
  - Per-story INVEST verdict
  - Mechanical NxN dep matrix (base rule 10) parsed from each story's Given lines
  - Per-story V audit (base rule 11) with merge-upstream flags
  - Topological build order
  - SPLIT RECOMMENDED and NOT A STORY markers

For any item whose deterministic pre-split count ≥2 → STOP that item's draft, mark it `SPLIT RECOMMENDED` in `backlog-summary.md`, and continue with the remaining items. NEVER auto-invoke `[[story-split]]`.

For any item whose INVEST V dimension FAILS → mark it `NOT A STORY` in `backlog-summary.md`, emit no files, and continue. NEVER stop the batch.

If N=1 after boundary confirmation → abort and instruct the user to use `/storywright-story-generate` instead.

## Application (step-by-step)

Follow the **base Application** skeleton for per-item story production (steps 3–11 per item). Batch-specific steps:

### Phase 0 — Parse, guard, and boundary confirmation

1. Read prior context per base rule 9.
2. Apply structural parsing to the input: numbered lists → bullets → blank-line-separated blocks. Each structural unit is one candidate item.
3. **N=0 guard:** if the parsed item list is empty (zero items after structural parsing and LLM fallback), emit: "No items found — paste a numbered list, bulleted list, or blank-line-separated blocks and try again." Stop. No further phases run.
4. If structural parsing yields fewer than 2 items or ambiguous boundaries, invoke LLM segmentation: infer one item per distinct user goal expressed in the input.
5. **N=1 abort:** if after parsing exactly 1 item is identified, emit: "Only one item found — use `/storywright-story-generate` for a single story." Stop.
6. Present the parsed boundary list via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code): "I found N items — does this look right? Reply to confirm, merge two items, split one, or edit the list."
7. Apply any user corrections and re-present if the count changed. Proceed only after the user confirms.

**Slug derivation (ONE rule, applied consistently):** derive the batch slug from the first item's inferred feature area. Lowercase, replace spaces with hyphens, truncate to ≤30 characters. No other slug rule applies.

Example: first item "Add checkout summary page" → feature area "checkout" → slug `checkout`.

### Phase 1 — Cohesion gate

Run the following deterministic algorithm before any clarification round:

- **Step A:** for each item i, extract:
  - `persona_i` — the primary actor noun (lowercase, singular; exclude generic terms: user, customer, usuario, cliente)
  - `area_i` — up to 2 highest-salience feature-area nouns in goal or verb-object position (e.g. "checkout", "cart", "authentication")
- **Step B:** items i and j **share context** when `persona_i ∩ persona_j ≠ ∅` OR `area_i ∩ area_j ≠ ∅`. Use stem/synonym matching (checkout/check-out, cart/basket). Build an undirected graph G with one edge per sharing pair.
- **Step C:** `cohesion% = |largest connected component| / N × 100`, rounded to the nearest integer.
- **Step D:** if `cohesion% ≥ 60` → **COHESIVE**; if `cohesion% < 60` → **DISPARATE**.
- **Step E:** announce the verdict inline as a blockquote (not a question):

  COHESIVE example:
  > ⚠️ Assumed: batch is cohesive (shared context: checkout / buyer, 80%, threshold 60%). Running one shared clarification round. Reply "per-item" to override.

  DISPARATE example:
  > ⚠️ Assumed: batch is disparate (no shared context detected, 40%, threshold 60%). Running per-item clarifications. Reply "cohesive" or "one round" to override.

If the PM replies with an override, honor it and re-announce the new mode before proceeding.

### Phase 2 — Clarification scope

**COHESIVE batch:** run `[[clarification-questions]]` over the UNION of all items. Deduplicate overlapping questions. Ask at most 4 questions in one batched round. Persist answers via base rule 9. These answers seed `.storywright-context.json` so each item's base step 5 gap-check finds them pre-answered.

**DISPARATE batch:** defer clarifications to per-item base step 5. Only infrastructure-level answers (output language, naming conventions, technical stack) are shared across items; content answers (persona, goal, AC specifics) stay per-item.

### Phase 3 — Per-item pipeline

For each confirmed item (1-based index N):

1. Run base Application steps 3–11 verbatim (persona, passive-goal check, gap-check, pre-split count, canonical block, rule H audit, dev enrichment, INVEST, render duo, log).
2. Use filename prefix `story-<N>.` (all items share one flat batch folder).
3. **Pre-split ≥2:** mark item as `SPLIT RECOMMENDED`, skip drafting the canonical block, emit no files. Continue to the next item.
4. **INVEST V = FAIL:** mark item as `NOT A STORY`, emit no files. Continue to the next item.
5. **INVEST other failures (T, N, E, I, S):** flag inline with `⚠️` in `backlog-summary.md` but still emit both files (base behavior).

Only items in `DRAFTED` status (step 10 logged) proceed to the Phase 4 matrix.

### Phase 4 — Cross-item analysis (N>1, DRAFTED items only)

Scope: only items that reached `DRAFTED` in Phase 3 participate in the matrix and V audit.

1. **Mechanical NxN matrix (base rule 10).** Parse each DRAFTED story's Given lines to detect dependencies.
2. **Per-story V audit (base rule 11).** Flag merge-upstream candidates.
3. **Topological build order.** Derive from the dependency matrix.

### Phase 5 — Output

Story pairs are already written by Phase 3 step 10. Emit:

1. **`backlog-summary.md`** at the batch folder root when N>1 OR any item is SPLIT RECOMMENDED or NOT A STORY:

   ```
   # Backlog Summary — <slug>

   Generated: YYYY-MM-DD HH:mm
   Items: N
   Drafted: D (story pairs emitted)
   Split recommended: S (no story files — run /storywright-story-split per item)

   **Cohesion:** COHESIVE | DISPARATE (<cohesion%>, threshold 60%, driver: persona/area/both)

   ## Stories

   | # | Title | INVEST verdict | Independence |
   |---|-------|----------------|--------------|
   | 1 | ...   | PASS / FAIL(T) | ...          |

   ## Dependency matrix

   (base rule 10 — NxN over DRAFTED items only, with Given citations and build order)

   ## V audit

   (base rule 11 per DRAFTED item)

   ## Notes

   - Item N: SPLIT RECOMMENDED (pre-split count: X). Run `/storywright-story-split` on this item manually.
   - Item M: NOT A STORY (INVEST V = FAIL). Rework or discard.
   ```

   **GUARD — banned sections:** do not use headings that start with "Dependencies", "Dependencias", "Risks", or "Riesgos" — use "Dependency matrix" and "Notes" instead (base rule H).

   After `## Stories` and before `## Dependency matrix`, include a `## Backlog Estimate` section as a planning aid:

   ```
   ## Backlog Estimate

   | # | Title | Points | Key Driver |
   |---|-------|--------|------------|
   | 1 | ...   | 5      | 3 deps     |
   | 2 | ...   | —  (split first) | SPLIT RECOMMENDED |
   | 3 | ...   | Spike  | E = FAIL   |
   |   | **Total drafted** | **10 SP** | sum of numeric values only |
   ```

   Rules:
   - SPLIT RECOMMENDED items → `— (split first)` in Points column; `SPLIT RECOMMENDED` in Key Driver.
   - Spike items (INVEST E = FAIL) → `Spike` in Points; `E = FAIL` in Key Driver.
   - Total row sums only numeric point values; excludes `—` and `Spike` rows.
   - Full justification table stays in `story-N.dev.md`; only Points + Key Driver appear here.

2. **`.storywright-context.json`** updated per base rule 9 (one file per batch folder). No `clarifications.md` when the host has an interactive clarification mechanism.

3. **Flat folder structure:** all files in `docs/storywright/YYYY-MM-DD-HHmm-batch-<slug>/` with no subdirectories. Slug derived per Phase 0 rule (first item's feature area, ≤30 chars, lowercase, hyphens).

NO `clarifications.md` when the host has an interactive clarification mechanism. NO Edge Cases / NFR sections **in PM files** (they live in `story-<N>.dev.md` per base rule 3a). NO per-claim visual tags.

## Examples

### Good
Input: numbered list of 3 checkout-related items.
- Phase 0 finds 3 items structurally.
- Phase 1: cohesion% = 100% → COHESIVE, one shared clarification round.
- Phase 3: items 1 and 2 pass INVEST → story pairs emitted; item 3 has pre-split ≥2 → SPLIT RECOMMENDED, no files.
- Phase 5: `backlog-summary.md` with 3-row table (2 DRAFTED, 1 SPLIT RECOMMENDED), 2×2 dep matrix over items 1–2.

### Good — disparate batch
Input: 4 items spanning auth, analytics, notifications, and payments.
- Phase 1: cohesion% = 25% → DISPARATE, per-item clarifications.
- Phase 3: each item runs base steps 3–11 independently.

### Good — N=0 guard fires
Input: "Let's work on some backlog items." (no parseable items)
- Phase 0 N=0 guard fires. Emits error message. Stops.

### Bad
Emitting per-story subdirectories inside the batch folder. All files must be flat.

### Bad
Auto-invoking `[[story-split]]` on a SPLIT RECOMMENDED item. Only flag and continue.

### Bad
Including edge cases, analytics events, or risk details in `backlog-summary.md`. Those live in `story-<N>.dev.md`.

### Bad
Skipping the dependency matrix in `backlog-summary.md` when N>1 with DRAFTED items.

## Common Pitfalls

- Running the cohesion gate AFTER starting clarifications — gate must run first.
- Including all items (including SPLIT RECOMMENDED and NOT A STORY) in the Phase 4 matrix — matrix is over DRAFTED items only.
- Using nested subfolders: `batch-checkout/story-1/story-1.standard.md` — wrong. All files flat in the batch folder.
- Applying the slug derivation rule inconsistently — one rule only: first item's feature area, ≤30 chars, lowercase, hyphens.
- Emitting `clarifications.md` when the host has an interactive clarification mechanism — violates base rule 1.
- All other pitfalls in `[[storywright-base]]` apply equally.

## References

- [[storywright-base]] — the rulebook (base Purpose section)
- [[story-generate]]
- [[story-refine]]
- [[story-split]]

<claude-specific>
- Read `[[storywright-base]]` before applying. Do not duplicate its rules in your reasoning.
- Phase 0 boundary confirmation is non-skippable — always ask via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code).
- The cohesion-gate algorithm (Steps A–E) is deterministic: same items → same graph → same verdict regardless of order.
- Phase 4 matrix is over DRAFTED items only. SPLIT RECOMMENDED and NOT A STORY items do not participate.
- Slug rule is fixed: first item's feature area, ≤30 chars, lowercase, hyphens. Do not invent variations.
- Build the dep matrix from Given-text parsing (base rule 10), not intuition.
- `backlog-summary.md` is PM-facing — no edge cases, analytics, risks, or technical DoD.
</claude-specific>

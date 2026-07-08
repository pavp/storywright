---
name: story-refine
description: Audit an existing user story and fix it in place, or amend it with a user-declared new requirement. Cohn+Gherkin canonical. Inherits storywright-base.
trigger: "/story-refine | refine this story | improve this story | refinar historia | this story is incomplete | I forgot to mention | add this to the story | one more requirement | me olvidé de mencionar | agregale a la historia"
intent: Refinement skill for stories that already exist but are incomplete or weakly specified. Behavior 100% identical to siblings except for source (existing story text) and split-behavior (recommend /story-split when pre-split count ≥2).
version: 2.4.0
inputs:
  - text
  - image
outputs:
  - story.standard.md
  - story.dev.md
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

Bring an existing user story up to standard *without* turning it into a feature spec. Emits two files: `story.standard.md` (PM-facing) + `story.dev.md` (dev-facing).

**All hard rules, canonical output shape, language detection, mechanical pre-split test, context persistence, terminal-only Q, mechanical NxN dep matrix, per-child V audit, and INVEST handling live in `[[storywright-base]]`. Read that first. Anything in this file is a SOURCE-SPECIFIC or SPLIT-BEHAVIOR delta only.**

## Source-specific differential

- **Source:** an existing user story (text). May be vague, missing sections, or have hand-wavy ACs.
- **What changes vs base:**
  - **Preserve original wording** where it was already good. Refine is NOT regenerate — if the PM already wrote a sharp persona / goal / so-that, do not rephrase it.
  - **Don't renumber ACs** the team may already reference externally. Append new content, don't shuffle.
  - **Detect which sections are present / missing / weak** before applying the base canonical block. Fill only what's weak; leave good sections alone.
  - If a companion image is attached, base conflict-detection applies. Story text is canonical for `User Story / Scope / Business value`; the image is canonical for `component names / observable states` referenced in AC.

## Amendment differential

- **Detection:** the full classification rule (two-path test, accepted story sources, ambiguity fallback) is stated in the numbered **Step R** in the Application section below — not duplicated here. This section covers only what happens once Step R has already selected the Amendment path: merge, conflict, and re-run semantics.
- **Merge-not-regenerate (on the Amendment path):** fold the delta into the parsed story BEFORE base step 5 (gap-check), so base steps 5–11 operate on the merged story. Preserve all existing wording not directly contradicted or extended by the delta — the Source-specific differential's "preserve original wording" rule applies unchanged; Amendment mode gets no weaker preservation rule. New ACs introduced by the delta are **appended** at the next unused `AC-N` (base AC-numbering rule, unchanged) — never renumber, reorder, or reuse existing AC numbers. If the delta only narrowly extends an existing AC's scope (e.g. a qualifier on an existing Given), editing that AC's text in place is permitted instead of appending a new one; log the edit either way (see Refinement log below).
- **Conflict-as-BLOCKING:** if the delta contradicts existing story content (Use Case, Preconditions, Business Rules, or an existing AC's Given/When/Then), this generalizes base step 0's conflict pattern (today used for image vs text) to story-vs-delta. Raise ONE BLOCKING `AskUserQuestion` (batched with any other blocking gaps in the same pass, per base rule 1's ≤4-per-call cap) before merging any contradicted content. Never silently prefer the existing story or the delta. Persist the resolution to `.storywright-context.json`'s existing `extra` field (base rule 9) — no new schema field. Only the contradicted content blocks; independent delta content proceeds through normal merge unless it causally depends on the contradicted content's resolution.
- **Mandatory pre-split re-run:** after merge and any conflict resolution, run the base deterministic pre-split test (base Application step 7) on the **merged** story, not the original. A prior pre-split pass on the pre-amendment story does not carry over — this is the load-bearing anti-silent-scope-growth guarantee. Count ≥2 fires the existing Split behavior differential below unchanged (no new split-decision options, no auto-split).
- **Re-render + refresh estimate:** when merged pre-split count ≤1, run base step 9 (INVEST), base step 8c (Estimate — re-run on the merged story, never carried over even if the verdict is unchanged), and base step 10 (render) exactly as for plain refine. Both `story.standard.md` and `story.dev.md` are re-rendered in full, not patched.
- **Project-less restatement (base rule 14):** the delta comes only from the user's message. Never read, scan, or infer the delta's content from the open repository, even to "verify" it. Technical inference stays marked `⚠️ Assumed:`.

## Split behavior differential

If the base **deterministic pre-split test** returns count ≥2:
- **STOP refining.**
- Show candidate children + per-pair dep notes (base rule 10) + V audit (base rule 11).
- Ask via `AskUserQuestion`: "This story has [N] independent flows. Run split now?" with options:
  - "Yes, split" → execute `[[story-split]]` inline (epic + children + .storywright-context.json).
  - "Continue without split" → proceed with single-story path (fill canonical block → INVEST → render both files).
  - "No, keep as-is" → stop. No output written.
- Do NOT silently auto-split without the AskUserQuestion confirmation.

If count ≤1:
- Proceed with the base step-by-step Application skeleton, applying the source-specific preservation rules above.

## Application (step-by-step)

Follow the **base Application** skeleton exactly, with one refine-local insertion. Refine-specific behavior:
1. **Step R (amendment detection — inserted after base step 1, before base step 2).** Classify the input into exactly ONE of two paths — **Amendment** or **Plain refine** — before any language/persona/gap branching runs. Accepted existing-story sources: (a) the story pasted as text in the message, (b) a prior `story.standard.md`/`story.dev.md` pair from an earlier run, (c) a reference resolvable via `.storywright-context.json` (base rule 9). The deciding predicate is phrase-agnostic: *is there a concrete requirement whose content is not already present in, or derivable by rephrasing, the existing story's Use Case / AC / Preconditions / Business Rules?* Yes → Amendment. No → Plain refine. Signal sources for "yes": an amendment trigger phrase (frontmatter `trigger`) is present, OR the user explicitly frames new content as an addition ("also", "additionally", "new requirement", equivalent Spanish framing) attached to sections not already covered by the story. An amendment trigger phrase alone is never sufficient — a phrase match with no actual new content beyond the existing story falls through to Plain refine, since there is no delta to merge. **Ambiguity fallback:** if the message could be read either way AND the ambiguity affects merge scope, raise ONE `AskUserQuestion` (base rule 1 terminal-only mechanism) to disambiguate, decided case-by-case from the paired story content — never from a static "ambiguous phrases" list. This is a within-Step-R fallback, not a third path.
- Step 5 (gap-check): only fill **weak/missing** sections; leave sharp sections alone.
- Step 7 (pre-split test): on count ≥2 → STOP refining, route to `/story-split` recommendation. On the Amendment path, this step runs on the **merged** story per the Amendment differential's mandatory re-run rule.
- Step 11 (log): label as "Refinement log". On the Amendment path, the log MUST still fit the base ≤3-line (≤5 if SPLIT) ceiling — achieve this by FOLDING, not by dropping records. All four records below are mandatory; they provably fit in 3 lines as shown:
  - Line 1 — base INVEST Verdict line (unchanged from base step 11).
  - Line 2 — `Amendment: <one-line delta summary> — <conflict status>`. Conflict status is either `no conflict` (fold inline, as shown) or, when a conflict was resolved, `Conflict: <what contradicted> — resolved: <resolution>` (this may fold into line 2 or take its own line if line 2 would otherwise be unreadable; either placement satisfies the ceiling since the total stays ≤3 lines).
  - Line 3 — `Estimate: <changed <old>→<new> | unchanged>` — the estimate-changed note, always present, on its own line or folded into line 2 if a conflict line pushed the count.
  The four records (amendment marker, delta summary, conflict status + resolution, estimate-changed note) are always mandatory on the Amendment path — folding is how they fit the ceiling, not a reason to omit one.

## Examples

### Good — READY
Input: story with title + Use Case + 2 vague ACs.
- Pre-split count = 1.
- Tighten ACs to single Given/When/Then. Leave Use Case alone (was good).
- INVEST → READY. ≤3-line Refinement log. Render.

### Good — SPLIT
Input: story with 7 AC bullets (grid + counter + pagination + link).
- Pre-split count = 4 (grid, counter, pagination, link).
- STOP. Terminal message: candidate children + dep notes + V audit + "Run `/story-split`".
- No refined story written.

### Good — passive goal fires
Refining: *"As a user, I want to view list of customers, so that I find details."*
- Rule G of base fires. Ask: "What does the user do with the customer they find?"
- User: "Call them." → strengthen so-that.

### Good — Amendment merged cleanly
Input: existing story with AC-1, AC-2 + message "I forgot to mention: admins can also bulk-delete search results."
- Step R: delta names a concrete requirement not present in AC-1/AC-2 → Amendment.
- No conflict with existing content. Merge appends AC-3 for the bulk-delete scenario; AC-1/AC-2 text untouched.
- Pre-split re-run on the merged story = 1 → no split. INVEST → READY. Estimate re-run. Refinement log notes the amendment, the one-line delta, "no conflict", and whether the estimate changed. Render both files.

### Bad — false-positive amendment routing
Input: existing story already covering guest checkout + message "also tighten the ACs so they're testable."
- No concrete new requirement is present — "also" here frames a *quality* request about existing content, not new content outside the story.
- Misrouting this to Amendment mode would wrongly force a merge/re-render cycle for what is really Plain refine. Step R's delta test must resolve this to Plain refine.

### Bad
Treating refine like generate — restating the user goal when the PM already wrote it.

### Bad
Renumbering AC bullets the team may already reference.

### Bad
Producing a 400-line refined story (violates base rule 3 + INVEST Small ceiling).

## Common Pitfalls (refine-specific)

- Rewriting good content. If a section is sharp, leave it.
- Renumbering ACs. Append, don't shuffle.
- Skipping the base pre-split test (step 7) — refining an oversized story produces an oversized refined story.
- Treating a trigger phrase alone as sufficient for Amendment mode — always run the delta test (Step R); a phrase with no new content falls through to Plain refine.
- Skipping the pre-split re-run after a merge because the original story already passed — a prior pass does not carry over to the merged story.
- All other pitfalls listed in `[[storywright-base]]` apply equally.

## References

- [[storywright-base]] — the rulebook
- [[story-generate]] (when input is ambiguous, not an existing story)
- [[story-split]] (when count ≥2)
- [[story-batch]] (when input is a multi-item backlog)

<claude-specific>
- Read `[[storywright-base]]` before applying. Do not duplicate its rules in your reasoning.
- Diff the original sections against the refined ones; only emit changes that materially improve the story.
- Use extended thinking when running the base pre-split counter.
</claude-specific>

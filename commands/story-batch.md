---
description: Generate N user stories from a multi-item backlog in one pass (one story per item, cohesion-aware clarifications)
argument-hint: <multi-item backlog>
---

Invoke the `story-batch` skill from the storywright pack to process:

$ARGUMENTS

Follow the skill's procedure:

1. Phase 0 — parse the input structurally (numbered → bullets → blank-line blocks). Guard: if no items found, stop with guidance. If exactly 1 item, abort and redirect to `/storywright-story-generate`. Present parsed boundaries and wait for user confirmation.
2. Phase 1 — run the cohesion gate: extract persona and feature-area nouns per item, build the sharing graph, compute the largest-connected-component percentage. Announce verdict inline as `⚠️ Assumed:` blockquote. Honor PM overrides.
3. Phase 2 — cohesive batch: one shared clarification round (≤4 questions) over the union of items. Disparate batch: per-item clarifications deferred to base step 5.
4. Phase 3 — per-item pipeline: run base Application steps 3–11 for each confirmed item. Items with pre-split count ≥2 → SPLIT RECOMMENDED (no files, flag in summary, continue). Items with INVEST V = FAIL → NOT A STORY (no files, flag, continue). All other items emit both files `story-N.{standard,dev}.md`.
5. Phase 4 — cross-item analysis over DRAFTED items only: mechanical NxN dependency matrix, per-story V audit, topological build order.
6. Phase 5 — emit `backlog-summary.md` (cohesion verdict, INVEST table, dep matrix, V audit, build order, SPLIT RECOMMENDED notes) + `.storywright-context.json`. All files in flat folder `docs/storywright/YYYY-MM-DD-HHmm-batch-<slug>/`.

Output in the input language.

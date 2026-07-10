---
description: Split an oversize story into an epic + child stories using INVEST + Humanizing Work patterns
argument-hint: <paste oversize story> [+ optional image for flow inventory]
---

Invoke the `storywright` skill. Intent: split (explicit intent instruction — honor as the highest-precedence routing signal; do NOT re-derive intent from the input). Split this story:

$ARGUMENTS

Follow the skill's procedure:

0. Detect companion sources (image). If present, use them to inventory candidate sub-flows (screen structure, visible states). If the image shows N flows but text mentions K (K < N), surface as BLOCKING clarification before drafting the split plan. Text is canonical for scope of the epic; the design is canonical for flow structure.
1. Run `invest-checklist` and apply the pre-split gates:
   - If Valuable FAILS → NOT A STORY. Don't split. Stop.
   - If Testable / Negotiable FAILS → fix in place, don't split. Stop.
   - If Estimable fails on unknowns → recommend a spike. Stop.
   - If Independent / Estimable / Small fails → continue.
2. Apply the 9-pattern catalog in order. Name the first pattern that fits + the core complexity (meta-pattern).
3. Calibrate to Cynefin domain (Obvious/Complicated vs Complex vs Chaotic).
4. Draft a split plan as a Markdown table with rationale, pattern, and proposed children.
5. Run the strategic evaluation: does the split reveal low-value work? Are children equal-sized?
6. STOP and ask the user to approve / adjust / cancel. Never auto-split.
7. After approval: write the epic duo — `epic.standard.md` (PM-facing: Objective/Hypothesis, `⚠️ Assumed:` Business Outcome(s) with stable identifiers, In/Out of scope, Core complexity) + `epic.dev.md` (dev-facing: decision trail — Why split, Patterns, Cynefin, children table, dependency matrix, build order, V audit, Notes, dev↔value bridge referencing outcomes by identifier only; NO `split-plan.md`) — plus both files per child (`NN-<slug>.standard.md` + `NN-<slug>.dev.md`, `NN` = zero-padded build-order ordinal, `<slug>` per Rule I). The duo always emits, even for a single drafted child.
8. Coherence check + recursive re-split for children still >1 sprint.
9. Save artifacts under the canonical output folder `docs/storywright/YYYY-MM-DD-HHmm-epic-<slug>/` (`<slug>` = the epic title per Rule I, after stripping a leading `Epic —`/`Epic:`/`Epic ` prefix, case-insensitive).

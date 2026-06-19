---
description: Split an oversize story into an epic + child stories using INVEST + Humanizing Work patterns
argument-hint: <paste oversize story> [+ optional image / Figma URL for flow inventory]
---

Invoke the `story-split` skill from the storywright pack to split this story:

$ARGUMENTS

Follow the skill's procedure:

0. Detect companion sources (image, figma-link). If present, use them to inventory candidate sub-flows (prototype links, frame structure). If Figma shows N flows but text mentions K (K < N), surface as BLOCKING clarification before drafting the split plan. Text is canonical for scope of the epic; design is canonical for flow structure.
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
7. After approval: write `epic.md` (single file — epic metadata, holds the decision trail; NO `split-plan.md`) + both files per child (`story-<N>.standard.md` + `story-<N>.dev.md`).
8. Coherence check + recursive re-split for children still >1 sprint.
9. Save artifacts under the canonical output folder `docs/storywright/YYYY-MM-DD-HHmm-<epic-slug>/`.

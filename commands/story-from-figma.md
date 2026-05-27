---
description: Generate user stories from a Figma file or frame URL (uses MCP Figma when available)
argument-hint: <Figma URL> [+ optional text prompt or screenshots]
---

Invoke the `story-from-figma` skill from the storywright pack to analyze:

$ARGUMENTS

Follow the skill's procedure:

1. Phase 0 — verify MCP Figma server is available. If not, ask the user to either install one, paste PNG exports, or describe the flows.
2. Phase 0.5 — detect companion text / screenshots. Use text as canonical for `User Story / Scope / Business Goal`; Figma as canonical for `Components / States / Flows`. Surface conflicts as BLOCKING clarifications. Never silently pick a winner.
3. Phase 1 — inventory pages and frames; group by prototype links into flows.
4. Phase 2 — per flow: identify goal, entry point, states, components. Score per-inference confidence (HIGH/MEDIUM/LOW). Mark MEDIUM/LOW with `> ⚠️ Assumed:` blockquotes.
5. Phase 3 — for any flow that fails INVEST (Small), hand off to `/story-split` before generating.
6. Phase 4 — invoke `story-generate` per flow. Emit dual outputs + `flow-summary.md` mapping stories → frames for traceability.

Output in the input language (text language wins if mixed inputs).

---
name: story-from-figma
description: Generate user stories from a Figma file or frame URL. Uses an MCP Figma server to enumerate frames, components, navigation, and states; falls back to asking for screenshots if MCP is unavailable.
trigger: "story from figma | generate from figma | analizar figma | https://www.figma.com/"
intent: Multimodal entrypoint skill. Inspects a Figma design, infers user flows and screens, and produces one or more stories via story-generate.
version: 1.0.0
inputs:
  - figma-link
outputs:
  - story.jira-wiki.md (per generated story)
  - story.standard.md (per generated story)
  - clarifications.md
composes:
  - _components/clarification-questions
  - _components/acceptance-criteria
  - _components/invest-checklist
  - _components/definition-of-done
  - _components/business-rules
  - _components/edge-cases
  - _components/analytics-events
  - _components/risks-and-dependencies
  - _components/jira-wiki-formatter
---

## Purpose

A Figma file usually represents N screens / N flows. This skill maps that visual structure into stories — one story per logical user goal, not one per frame.

## When to use

- User pastes a Figma link.
- User says "generate stories from this design".

## Inputs & interpretation

- **figma-link** — file URL, page URL, or specific frame URL. Detect the scope:
  - File URL → consider the whole file; ask which page or flow to focus on
  - Page URL → enumerate frames in that page
  - Frame URL → single-screen analysis (usually one story)

## Application (step-by-step)

### Phase 0 — MCP availability check

1. Verify an MCP Figma server is connected to Claude Code. See `mcp-figma-notes.md` in this skill folder for setup options.
2. If MCP is unavailable:
   - Ask the user to either (a) install an MCP Figma server, (b) export the relevant frames as PNGs and drop them in chat, or (c) paste a textual description of the flows.
   - Continue under the chosen fallback. The rest of the skill works with screenshots via Claude vision.

### Phase 1 — Inventory

1. List pages in the file (if MCP allows).
2. For the target page, list frames with:
   - Frame name
   - Frame type (entry, modal, error state, empty state, success state, loading, etc.)
   - Outgoing prototype links (which other frame each interactive element points to)
3. Identify the **flows** by grouping frames connected by prototype links. One flow = one candidate story (or epic if large).

### Phase 2 — Per-flow inference

For each flow:

1. Identify the **goal** (what user outcome does this flow achieve?).
2. Identify the **entry point** (where does the user start?).
3. Enumerate **states**: empty, loading, success, error, edge.
4. Identify **components** (forms, lists, modals) and their **inputs/outputs**.
5. Score confidence per inference: HIGH (visible in design), MEDIUM (implied), LOW (assumed). Anything below HIGH gets `> ⚠️ Assumed:` in the output.
6. Pass the structured inference to `[[story-generate]]` to produce the full story.

### Phase 3 — Splitting check

If a single flow has too many states or branches, run `[[invest-checklist]]` first. If it returns `SPLIT RECOMMENDED`, hand off to `[[story-split]]` before generating.

### Phase 4 — Output

For each story:
- Emit `story.jira-wiki.md` + `story.standard.md` per the formatter.
- Emit a single `flow-summary.md` listing all stories produced and the frames they map to, so reviewers can audit traceability.

If any inference is LOW confidence, add to `clarifications.md`.

## Examples

### Good

Input: Figma file URL with 3 flows on the "Auth" page (login, signup, password reset).

Output:
- 3 stories (one per flow).
- Each story references the frames it derived from: `Maps to frames: AUTH-001, AUTH-002, AUTH-003`.
- Account-recovery flow flagged for `[[story-split]]` because it had 12 frames covering multiple recovery methods.

### Bad

One story per frame. Frames are screens; stories are user goals. A single goal may span 5 frames.

## Common Pitfalls

- Treating each frame as a story.
- Skipping prototype-link analysis — without flow structure, inferred user goals are guesses.
- Ignoring empty/error/loading states. Designers usually include them; PMs often miss them.
- Trusting MEDIUM/LOW inferences silently. Always surface them.
- Generating stories without verifying that the design covers all error paths (often the design only shows the happy path).

## References

- [[story-generate]]
- [[story-split]]
- [[clarification-questions]]
- `./mcp-figma-notes.md` (setup of MCP server)

<claude-specific>
- Use Claude's native vision when MCP is unavailable and the user drops PNGs.
- Use extended thinking for flow grouping — prototype links can be ambiguous.
- Cache the Phase 2 inference checklist across calls.
- When MCP Figma is available, batch frame metadata fetches into one round trip to minimize tool round-trips.
</claude-specific>

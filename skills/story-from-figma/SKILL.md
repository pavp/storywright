---
name: story-from-figma
description: Generate Cohn+Gherkin user stories from a Figma URL. One story per user-goal flow, not per frame. Inherits all hard rules from storywright-base.
trigger: "/story-from-figma | story from figma | generate from figma | analizar figma | https://www.figma.com/"
intent: Multimodal entrypoint. Behavior 100% identical to siblings except for source (Figma URL via MCP, with PNG fallback) and split-behavior (one canonical story per logical user-goal flow; flows with count ≥2 routed to /story-split).
version: 2.3.0
inputs:
  - figma-link
outputs:
  - story-1.standard.md
  - story-1.dev.md
  - flow-summary.md
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
---

## Purpose

A Figma file usually represents N screens / N flows. This skill maps that visual structure into Cohn+Gherkin stories — **one story per logical user goal, not one per frame**.

**All hard rules, canonical output shape, language detection, terminal-only Q, mechanical NxN dep matrix, per-child V audit, context persistence, and INVEST handling live in `[[storywright-base]]`. Read that first. Anything in this file is a SOURCE-SPECIFIC or SPLIT-BEHAVIOR delta only.**

## Source-specific differential

- **Source:** a Figma file/page/frame URL, accessed via MCP Figma server. Falls back to PNG screenshots if MCP is unavailable.
- **What changes vs base:**
  - **Design Reference banner is always Figma** (`**Source: Figma → values can be tokenized at implementation.**`) when MCP is used. Switches to the raster banner if user falls back to PNGs.
  - **Persona / Goal inferred from prototype flow + frame text** (rule 4a base signal table includes Figma frame names and layer text as medium-weight signals).
  - **One story per logical user-goal flow**, not per frame. Group frames by prototype-link connectivity to identify flows.
  - **Companion text overrides Figma** for `User Story / Scope / Business Goal` if both are present. Figma is canonical for `Components / States / Flow structure`.

## Split behavior differential

This skill may produce **multiple stories in one invocation** (one per flow). When N>1:
- **MANDATORY: emit `flow-summary.md`** with:
  - Per-story INVEST verdict
  - Mechanical NxN dep matrix (base rule 10) parsed from each story's Given lines
  - Per-story V audit (base rule 11) with merge-upstream flags
  - Topological build order
- For any single flow whose deterministic pre-split count ≥2 → STOP that flow's draft, route to `[[story-split]]`. Mark the flow as SPLIT RECOMMENDED in `flow-summary.md`. Continue with the other flows.

If N=1 (single frame URL) → standard single-story output. No `flow-summary.md`.

## Application (step-by-step)

Follow the **base Application** skeleton for the front-end behaviors (context load, language with Figma signal weighting, persona, passive-goal, gap-check, siblings). Figma-specific steps:

### Phase 0 — MCP availability + context load

1. Verify MCP Figma server is connected. See `mcp-figma-notes.md`.
2. Read prior context per base rule 9.
3. If MCP unavailable, ask via `AskUserQuestion` for fallback: (a) install MCP, (b) export PNGs, (c) paste textual flow descriptions. If user picks PNG, set `design_source = raster` in context and use the raster banner.

### Phase 1 — Inventory (MCP)

1. List pages in the file (if MCP allows).
2. For the target page, list frames with: frame name, frame type (entry/modal/error/empty/success/loading), outgoing prototype links.
3. Identify **flows** by grouping frames connected by prototype links. One flow = one candidate story (or epic if pre-split count ≥2).
4. Apply base rule D: visual variants of the same flow do NOT count as new flows.

### Phase 2 — Per-flow inference

For each flow:
1. Identify the user goal, entry point, states (empty/loading/success/error/edge).
2. Score confidence per inference (HIGH/MEDIUM/LOW). Below HIGH → `⚠️ Assumed` inline.
3. Run base rule G (passive-goal check) on the inferred goal.
4. Run base deterministic pre-split counter on the flow.
   - Count ≤1 → draft the base canonical block for this flow.
   - Count ≥2 → mark flow as SPLIT RECOMMENDED; skip drafting.

### Phase 3 — Draft canonical block per flow (count ≤1 flows only)

Use the base canonical output shape. Design Reference banner per source-specific differential above.

### Phase 4 — Multi-flow analysis (N>1)

1. **Mechanical NxN matrix (base rule 10).** Parse each story's Given lines.
2. **Per-story V audit (base rule 11).** Flag merge-upstream candidates.
3. **Coherence check.** Union of stories covers the journey shown in Figma.

### Phase 5 — Output

Per drafted flow, render both files via `[[story-formatter]]` (same 2-file contract as `story-generate` / `story-refine`):
- `story-<N>.standard.md` (PM-facing) + `story-<N>.dev.md` (dev-facing).

If N>1 OR any flow was routed to split:
- `flow-summary.md` with the matrix, V audit, build order, and SPLIT-RECOMMENDED markers.

Plus `.storywright-context.json` updated (`extra.figma_url`, `extra.figma_scope`, `extra.mcp_available`).

NO `clarifications.md`. NO Edge Cases / NFR sections **in the PM files** (they live in `story-<N>.dev.md` per base rule 3a). NO per-claim visual tags.

## Examples

### Good
Input: Figma file URL with 3 flows on the "Auth" page (login, signup, password reset).
Output:
- 3 canonical stories (one per flow).
- `flow-summary.md` with mechanical matrix (#2 DEP #1; #3 independent).
- V audit: all PASS.
- Recovery flow has 12 frames → pre-split counter ≥2 → marked SPLIT RECOMMENDED; not drafted.

### Good — PNG fallback
MCP unavailable. User exports 3 PNGs. Skill switches banner to raster, marks `design_source = raster`, generates 3 stories with single raster banner each.

### Good — passive goal fires
Flow goal inferred as "view dashboard". Base rule G fires. Ask: "What does the user do with the dashboard data?". User: "Spot anomalies and drill in." So-that strengthened.

### Bad
One story per frame. Frames are screens; stories are user goals.

### Bad
Emitting `clarifications.md` (violates base rule 1).

### Bad
Skipping the mechanical matrix in `flow-summary.md` when N>1.

## Common Pitfalls (figma-specific)

- Treating each frame as a story.
- Skipping prototype-link analysis — without flow structure, user goals are guesses.
- Ignoring empty/error/loading states. In the PM files fold them into AC failure paths (no edge-case section); the technical detail goes to `story-<N>.dev.md`.
- Trusting MEDIUM/LOW inferences silently — mark `⚠️ Assumed`.
- Skipping per-story V audit when N>1 (figma flows over-split easily).
- All other pitfalls in `[[storywright-base]]` apply equally.

## References

- [[storywright-base]] — the rulebook
- [[story-generate]]
- [[story-refine]]
- [[story-split]]
- `./mcp-figma-notes.md` (MCP server setup)

<claude-specific>
- Read `[[storywright-base]]` before applying. Do not duplicate its rules in your reasoning.
- Use Claude vision when MCP is unavailable and the user drops PNGs.
- Use extended thinking for flow grouping — prototype links can be ambiguous.
- When MCP is available, batch frame metadata fetches into one round trip.
- Build the multi-story dependency matrix from Given-text parsing (base rule 10), not intuition.
</claude-specific>

---
name: story-from-figma
description: Generate Cohn+Gherkin user stories from a Figma URL. Maps prototype flows to stories (one per user goal, not per frame). Asks ONLY in terminal.
trigger: "/story-from-figma | story from figma | generate from figma | analizar figma | https://www.figma.com/"
intent: Multimodal entrypoint. Inspects a Figma design, infers flows and screens, and emits one canonical story per logical user goal. Honors v2.2 hard rules (terminal-only Q, no mini-PRD, mechanical deps for split, V audit per child).
version: 2.2.0
inputs:
  - figma-link
outputs:
  - story-<N>.standard.md
  - story-<N>.jira-wiki.md
  - flow-summary.md
  - .storywright-context.json
composes:
  - _components/clarification-questions
  - _components/acceptance-criteria
  - _components/invest-checklist
  - _components/jira-wiki-formatter
---

## Purpose

A Figma file usually represents N screens / N flows. This skill maps that visual structure into Cohn+Gherkin stories — **one story per logical user goal, not one per frame**. Splits aggressively if any flow has multiple outcomes.

## Hard rules (v2.2 parity with refine/generate/split)

1. **Terminal-only clarifications.** Never write any sidecar question file (no `clarifications.md`). All gap questions through `AskUserQuestion`, batched ≤4. Non-blocking gaps → `⚠️ Assumed` inline.

2. **Cohn + Gherkin canonical per story.** Each generated story has ONE Use Case + ONE AC scenario (one Given chain + one `When` + one `Then`). If a flow naturally has >1 `When`/`Then` → STOP and hand off to `[[story-split]]`.

3. **No mini-PRDs.** Prohibited in each generated story:
   - NFR blocks — DoD only
   - Edge Cases enumerations as a section — fold into AC failure paths
   - Dependencies as prose — Jira links only
   - Per-claim visual specs — single banner (rule 5)
   - Generation logs >3 lines (>5 if SPLIT recommended)

4. **Output language matches the user's chat language**, not the Figma file's. Auto-detect via rule 4a; ask only if signals split. Persist via rule 9.

5. **Visual inference confidence — single banner only.** Since the source IS Figma, the banner is always `**Source: Figma → values can be tokenized at implementation.**`. If MCP Figma is unavailable and the user falls back to PNG exports, switch the banner to raster (`pixel-derived, not token-confirmed`).

6. **Sibling task IDs.** When the inventory phase produces multiple flows, ticket slugs follow rule F (naming pattern). Do NOT invent slugs without consulting `.storywright-context.json`.

7. **Mockup chrome detection — closed list** (nav rail, top bar, footer, toast slot, modal scrim, app tabs). If a frame shows chrome that's NOT explicitly part of a flow, ask via `AskUserQuestion` whether it's a separate story, shared shell, or out-of-scope.

8. **Anti-PRD is part of each story's INVEST `Small` criterion** — see `[[invest-checklist]]` Small.

9. **Cross-skill context persistence.** Read `<output-folder>/.storywright-context.json` first (exact folder only). Write resolved answers back. Schema same as other v2.2 skills, plus:
   ```json
   {
     "extra": {
       "figma_url": "<url>",
       "figma_scope": "file | page | frame",
       "mcp_available": true | false
     }
   }
   ```

10. **Mechanical NxN dep matrix when emitting multiple stories (rule A).** If N>1 flows produce N stories, parse each story's `Given` lines for surface nouns owned by sibling flows. Mark `DEP(Sj → Si)` per match. Render the matrix in `flow-summary.md`. No intuition.

11. **Per-story V audit (rule C).** For each candidate story, one-line test: "If only this story ships and no sibling flow exists, does a real user complete a real task?". If no → `WEAK · merge-upstream-candidate`. Recommend merging in `flow-summary.md`.

12. **Passive-goal downstream prompt (rule G).** If a story's `I want to` verb is observational AND `so that` lacks downstream action → ask once via `AskUserQuestion`.

### 4a. Language auto-detect — expanded signals (E)
Same weighted table as refine/generate/split (Gherkin keywords, persona phrasing, column names, domain verbs, title). Plus Figma-specific signal: **frame names** and **layer text** in M = medium weight.

### Rule F. Naming pattern — ask once, persist
Same options. Persist in `naming_pattern` inside `.storywright-context.json`. Used for all story slugs in this run.

### Rule D. Surface vs styling
Same deterministic rule. A frame counts as a separate flow ONLY if it has its own user goal (verb where the user *does something*). A purely visual variant (color theme, light/dark) is NOT a new flow.

## When to use

- User pastes a Figma link.
- User says "generate stories from this design".

## Inputs & interpretation

- **figma-link** — file URL, page URL, or specific frame URL. Detect the scope:
  - File URL → consider the whole file; ask which page or flow to focus on
  - Page URL → enumerate frames in that page
  - Frame URL → single-screen analysis (usually one story)

## Application (step-by-step)

### Phase 0 — MCP availability + context load

1. Verify MCP Figma server is connected. See `mcp-figma-notes.md`.
2. **Read prior context.** If `<output-folder>/.storywright-context.json` exists (exact folder only), load it.
3. If MCP unavailable:
   - Ask via `AskUserQuestion`: install MCP / export PNGs / paste textual flow descriptions.
   - If user falls back to PNG, set `design_source = raster` in context file and use the raster banner per rule 5.

### Phase 0.5 — Companion inputs + language

1. Detect companion text or PNGs.
2. Run language auto-detect (rule 4a). Adopt silently if signals agree; ask if split.
3. Persona sharpening: if persona ambiguous, ask via `AskUserQuestion`.

### Phase 1 — Inventory (MCP)

1. List pages in the file (if MCP allows).
2. For the target page, list frames with:
   - Frame name
   - Frame type (entry, modal, error state, empty state, success state, loading, etc.)
   - Outgoing prototype links
3. Identify **flows** by grouping frames connected by prototype links. One flow = one candidate story (or epic if large).
4. Apply rule D: visual variants of the same flow do NOT count as new flows.

### Phase 2 — Per-flow inference

For each flow:

1. Identify the **goal** (what user outcome).
2. Identify the **entry point**.
3. Enumerate **states**: empty / loading / success / error / edge. Fold into AC failure paths (rule 3); do NOT emit an Edge Cases section.
4. Identify **components** and their **inputs/outputs**.
5. Score confidence per inference: HIGH / MEDIUM / LOW. Below HIGH → `⚠️ Assumed` inline.
6. Run passive-goal check (rule G).
7. Run pre-split deterministic counter (rule D) on the flow. If count ≥2 → recommend `[[story-split]]` for THAT flow before drafting.

### Phase 3 — Draft canonical block per flow

```markdown
### [Flow Title]

#### Use Case
- **As a** [persona]
- **I want to** [action]
- **so that** [outcome with downstream action — rule G]

#### Acceptance Criteria
- **Scenario:** [single-outcome scenario name]
- **Given:** [context — surface nouns drive flow-summary dep matrix]
- **When:** [single trigger]
- **Then:** [single observable outcome]

#### Design Reference
**Source: Figma → values can be tokenized at implementation.**
- <frame URL or frame names>

#### INVEST
- I/N/V/E/S/T — one line each.
- **Verdict:** READY | SPLIT RECOMMENDED | NEEDS REFINEMENT | NOT A STORY

#### Generation log (≤3 lines)
- Mapped from frames: <FRAME-IDs>; pattern: <if any>.
```

### Phase 4 — Multi-flow analysis (if N>1)

1. **Mechanical NxN dep matrix (rule 10).** Parse each story's Given lines for surface nouns owned by sibling flows. Emit in `flow-summary.md`.

2. **Per-story V audit (rule 11).** Flag merge-upstream candidates loudly.

3. **Coherence check** — verify the union of stories covers the user journey shown in Figma. Flag gaps.

### Phase 5 — Output

For each story:
- `story-<N>.standard.md` + `story-<N>.jira-wiki.md`.

Plus single `flow-summary.md`:
```markdown
### Flow Summary — <Figma file/page>

| # | Story | Frames | INVEST verdict | V audit |
|---|---|---|---|---|
| 1 | login-google-web | AUTH-001, AUTH-002 | READY | PASS |
| 2 | login-google-mobile | AUTH-101 | READY (after #1) | PASS |
| 3 | recovery-flow | AUTH-201..AUTH-212 | SPLIT RECOMMENDED | — |

**Dependency matrix (rule 10):**

|     | #1 | #2 | #3 |
|-----|----|----|----|
| #1  | —  |    |    |
| #2  |DEP | —  |    |
| #3  |    |    | —  |

**Build order:** #1 → #2 (parallel: #3 after its own split).

**Design source:** Figma (or raster, if PNG fallback).
```

Plus `.storywright-context.json` updated.

NO `clarifications.md`. NO Edge Cases sections. NO NFR blocks. NO per-claim visual tags.

## Examples

### Good
Input: Figma file URL with 3 flows on the "Auth" page (login, signup, password reset).
Output:
- 3 canonical stories.
- `flow-summary.md` with mechanical matrix (#2 DEP #1; #3 independent).
- V audit: all PASS.
- Recovery flow has 12 frames → pre-split counter ≥2 → recommend `[[story-split]]` for #3 only.

### Good — PNG fallback
MCP unavailable. User exports 3 PNGs. Skill switches banner to raster, marks `design_source = raster`, generates 3 stories with `[mockup-pixel-derived]`-style inheritance (single banner per Design Reference).

### Good — passive goal fires
Flow goal inferred as "view dashboard". Skill detects passive verb → asks: "What does the user do with the dashboard data?". User: "Spot anomalies and drill into them." So-that strengthened.

### Bad
One story per frame. Frames are screens; stories are user goals.

### Bad
Emitting `clarifications.md`. Violates rule 1.

### Bad
Skipping the mechanical matrix in `flow-summary.md` when N>1.

## Common Pitfalls

- Treating each frame as a story.
- Skipping prototype-link analysis — without flow structure, user goals are guesses.
- Ignoring empty/error/loading states. Designers usually include them; fold into AC failure paths.
- Trusting MEDIUM/LOW inferences silently — mark `⚠️ Assumed`.
- Generating stories without verifying coverage of all error paths.
- Skipping per-story V audit (rule 11) — figma flows are easy to over-split.
- Re-asking questions already in `.storywright-context.json`.
- Tagging every visual claim instead of using the single Figma banner.

## References

- [[story-generate]]
- [[story-split]]
- [[story-refine]]
- [[clarification-questions]]
- `./mcp-figma-notes.md` (MCP server setup)

<claude-specific>
- Use Claude vision when MCP is unavailable and the user drops PNGs.
- Use extended thinking for flow grouping — prototype links can be ambiguous.
- Cache the Phase 2 inference checklist across calls.
- When MCP Figma is available, batch frame metadata fetches into one round trip.
- Read `.storywright-context.json` ONLY from the exact target output folder.
- Build the multi-story dependency matrix from Given-text parsing (rule 10), not intuition.
- Never call Write for any sidecar question file. Use `AskUserQuestion`.
</claude-specific>

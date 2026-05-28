---
name: storywright-base
description: Shared base behavior for all storywright top-level skills. Hard rules, canonical output, terminal-only Q, context schema, mechanical deps, V audit, language detect.
trigger: "internal use by story-* skills"
intent: Component skill that holds the v2.2 baseline. Top-level skills (story-generate, story-refine, story-split, story-from-figma) compose this and add only their source-specific behavior on top.
version: 2.3.0
inputs:
  - none
outputs:
  - none
---

## Purpose

Every top-level storywright skill must behave identically except for three things:

1. **Source** — what the input is (raw prompt / existing story / oversize story / Figma URL).
2. **Prompt** — what the user is asking for.
3. **Split behavior** — whether the skill produces 1 story, recommends a split, or produces N stories directly.

Everything else (how to ask questions, what shape the output takes, how to detect language, how to count outcomes, how to flag dependencies, how to persist context) lives here.

If you are reading this through a top-level skill, treat every rule below as non-negotiable for that skill too.

## Hard rules (v2.2 — apply to all top-level storywright skills)

1. **Terminal-only clarifications.** Never write any sidecar question file (no `clarifications.md`, no `questions.md`, nothing). All gap questions go through `AskUserQuestion`, batched ≤4 per call. Non-blocking gaps → mark `⚠️ Assumed: <text>` inline in the story body — do not ask. Do NOT announce the absence of a clarifications file ("Clarification resolved", "no clarifications.md needed", or any equivalent). Silence = no questions. Proceed directly.

2. **Cohn + Gherkin canonical.** Every story (or child story) has:
   - ONE Use Case block (`As a / I want to / so that`).
   - ONE AC Scenario (one Given chain + one `When` + one `Then`).
   If the input naturally needs >1 `When`/`Then`, the skill MUST stop the single-story path and route to `[[story-split]]`.

3. **No mini-PRDs in the PM story body.** PROHIBITED in `story.standard.md` / `story.jira-wiki.md`:
   - Non-Functional Requirements blocks (a11y/i18n/perf/tokens) — DoD only.
   - Edge Cases enumerated as their own section — fold into AC failure paths.
   - Dependencies as prose — Jira ticket links only.
   - Per-claim visual specs (pixel measurements, hex inferences) inline — use single banner (rule 5).
   - Logs >3 lines (>5 if SPLIT verdict).

3a. **Technical detail lives in `story.dev.md`.** The content rule 3 bans from the PM body is NOT discarded — it is rendered in the dev-facing file. Edge cases, analytics events, risks/dependencies, technical considerations, and the command-level DoD belong in `story.dev.md`, populated by the enrichment components (Application step 8b). The PM↔dev split is the home for this content; rule 3 governs the PM files, `story.dev.md` carries the technical detail. See `[[jira-wiki-formatter]]` for the audience table.

4. **Output language matches the user's chat language**, not the input's. Auto-detect first via rule 4a; only ask via `AskUserQuestion` if signals split.

5. **Visual inference confidence — single banner only.** Do NOT tag every visual claim. ONE banner at the top of the Design Reference block declares source type; all claims under it inherit:
   - Raster source (PNG/JPG) → `**Source: raster mockup → all visual specs are pixel-derived, not token-confirmed.**`
   - Figma source → `**Source: Figma → values can be tokenized at implementation.**`
   - Design-token source → `**Source: design tokens → values are authoritative.**`
   Never assert hex / px / spacing from raster without the raster banner.

6. **Sibling task IDs.** If the story references "next task / future task / another story / siblings" — check `<output-folder>/.storywright-context.json` first. If unresolved, ask via `AskUserQuestion`. If user has none yet, leave `TODO: link sibling` (unless rule F applies — invent slug per persisted naming pattern).

7. **Mockup chrome detection — closed list.** Chrome = exactly:
   - left nav rail / sidebar
   - top bar (user menu, global breadcrumbs, global search)
   - footer
   - persistent toast/snackbar slot
   - persistent modal scrim
   - app-level tabs

   If a companion image shows any of these AND the input does not mention them, ask via `AskUserQuestion` whether each is `in-scope`, `sibling-scope`, or `out-of-scope`. Anything not on this list (cards, section headers, in-flow buttons) is NOT chrome — do not surface as a chrome question.

8. **Anti-PRD is part of INVEST `Small`, not a separate step.** See `[[invest-checklist]]` Small criterion — line-count ceiling (~60 lines) lives there. Single source of truth.

9. **Cross-skill context persistence.** When any storywright skill resolves a clarification via `AskUserQuestion`, write the **answer** to `<output-folder>/.storywright-context.json`. Read only from the exact output folder of the current invocation; never search siblings or parents. Schema:

   ```json
   {
     "version": 1,
     "decided_at": "<ISO date>",
     "decided_by_skill": "story-generate | story-refine | story-split | story-from-figma",
     "language": "EN | ES | ...",
     "chrome_scope": "in-scope | in-scope-placeholder | sibling | out-of-scope",
     "siblings": "TODO | <list of IDs> | not-applicable",
     "design_source": "raster | figma | tokens",
     "naming_pattern": "kebab-feature-action | verb-noun | domain-action | jira-prefix",
     "extra": {}
   }
   ```

   Every skill MUST read this file BEFORE asking any question. Every skill MUST write this file when it resolves a question.

10. **Children independence — mechanical detection (rule A).** When any skill produces multiple stories or children (story-split, story-from-figma multi-flow, story-refine recommending split):
    - For each child Cj, parse its `Given:` and `and Given:` lines.
    - If any Given text contains a surface noun owned by child Ci (Ci's title/scope owns "grid" and Cj's Given mentions "the grid") → mark `DEP(Cj → Ci)`.
    - The dependency map IS the union of those text matches. **Do not add deps "you sense" without a Given citation.**
    - Affected child's INVEST `Independent` becomes `PARTIAL · depends on <Ci>`.
    - Parent epic / flow-summary file lists explicit build order (topological sort of the matrix).
    - If a dep is real but no Given mentions it, rewrite the child's Given to make it explicit, then re-run the match. Intuition-based deps are forbidden.

11. **Per-child V audit (rule C).** After any split-style output, for each candidate child run a one-line test:
    "If only this child ships and no sibling exists, does a real user complete a real task?"
    - If yes → V = PASS.
    - If no, useless until `<other>` ships → V = `WEAK · merge-upstream-candidate`. Recommend merging into the parent surface instead of keeping standalone.
    Do not let stylistic/UI-fragment children survive a split.

12. **Passive-goal downstream prompt (rule G).** If the story's `I want to` verb is observational (`view, see, read, browse, look at, inspect, monitor`) AND the `so that` does not name a follow-up user action — ask once via `AskUserQuestion`: "What does the user do with this?". Strengthen the `so that` accordingly. Skip if `so that` already names a downstream action.

### 4a. Language auto-detect — expanded signals (rule E)

Run cheap detection before asking. Multi-signal weighted decision:

| Signal | Where to look | Weight |
|---|---|---|
| Gherkin keywords in M ("Given/When/Then") | AC block | high |
| Persona phrasing in M ("As a user" vs "Como un usuario") | Use Case | high |
| Column / field names in M ("Phone - primary", "Teléfono - principal") | AC bullets | medium |
| Domain verbs in M ("clicking" vs "hacer clic") | AC bullets | medium |
| Figma frame names / layer text in M (when source = figma) | design source | medium |
| Title language | header | low |

**Decision:**
- All high+medium signals agree on language M → adopt M silently. Mark inline `⚠️ Assumed: output language = <M> (auto-detected from <signals>)`.
- Signals split → ask once via `AskUserQuestion`.
- User chat = L, story body = M, but high signals tie → prefer M (story body is contract).

Persist via rule 9.

### Rule D. Surface vs styling (deterministic)

A "named UI surface" counts as a separate outcome (+1 in the pre-split counter) ONLY if it has its own user goal — a verb in the input where the user *does something with that surface* (clicks it, navigates with it, reads it, configures it).

If a noun is mentioned only in a styling context (color, padding, alignment, background) or as a sub-component of a parent surface (column inside a grid, label inside a button) → it is NOT a surface. It is styling. Count = 0.

Examples:
- "header row visually distinct (purple)" → styling of grid → 0
- "pagination control with page numbers" → surface with user goal (navigating) → +1
- "5 columns: Code, Name, Phone, ..." → sub-components of grid → 0 (grid still counts once)
- "results counter next to search button" → surface with user goal (reading count) → +1

### Rule F. Naming pattern — ask once, persist

When any skill needs to invent a tentative ticket slug AND `.storywright-context.json` has no `naming_pattern` field, ask once via `AskUserQuestion`:

```
Which naming pattern do you use for tickets?
- kebab-case feature-action      → "customer-search-bar-wire"
- verb-noun                       → "wire-search-bar"
- domain-action                   → "search.customer.wire-input"
- Jira prefix + numeric           → "CSB-001"
```

Persist in `naming_pattern`. Use for all sibling slugs in this run AND future skills reading the same context file.

### Deterministic pre-split test (used by all skills)

Mechanical counter. Apply the table — do NOT eyeball:

| Signal | Hit value |
|---|---|
| AC bullet starting with action verb at user level ("clicking", "submitting", "entering", "navigating") | +1 each |
| Distinct `When [event]` phrasing already implied in the story | +1 each |
| Distinct named UI surface mentioned at the AC level (rule D applies) | +1 each |

**Do NOT count:**
- sub-bullets describing the same flow
- styling of an existing surface
- preconditions or passive "rendered" statements

**Decision:**
- Count ≤1 → proceed with single-story path.
- Count ≥2 → STOP single-story path. Route to split behavior per the host skill (recommend `/story-split`, produce epic+children, or recurse).

## Canonical output shape (this is the WHOLE story — no exceptions)

> **Note:** This block shows the *section taxonomy and rules* — not heading levels or exact markup. The rendered artifact must follow the `story-generate/templates/` files exactly: `#` for title, `##` for sections (CommonMark) or `h2.`/`h3.` (Jira wiki). INVEST is a **process step** — it informs the Verdict line in the log but is NOT emitted as a section in the output artifact.

```markdown
### [Title]

#### Use Case
- **As a** [persona — never just "user"]
- **I want to** [action]
- **so that** [outcome with downstream action — rule G]

#### Preconditions (optional, only if user provided)
- ...

#### Out of Scope (optional, only if user provided)
- ...

#### Acceptance Criteria
- **Scenario:** [single-outcome scenario name]
- **Given:** [context — surface nouns here drive dep matrix per rule 10]
- **and Given:** [context]
- **When:** [single trigger]
- **Then:** [single observable outcome]

#### Design Reference (optional)
**Source: <raster | figma | tokens> → <banner from rule 5>**
- [link or path]
- visual notes: [...]

#### <Generation | Refinement | Split> log (≤3 lines; ≤5 if SPLIT verdict)
- INVEST Verdict: <READY | SPLIT RECOMMENDED | NEEDS REFINEMENT | NOT A STORY>
- [other changes]
```

NOTHING else. No NFR block. No Edge Cases enumeration. No Dependencies prose. No Assumptions block (assumptions get `⚠️ Assumed` inline or are resolved via `AskUserQuestion`). No standalone INVEST section — verdict belongs in the log only.

## Application (step-by-step — every skill follows this skeleton)

0. **Detect companion sources** (image, figma-link, accompanying text). Run conflict detection against the primary input. Run chrome detection using rule 7. Surface conflicts as BLOCKING `AskUserQuestion`.

1. **Read prior context.** Load `<output-folder>/.storywright-context.json` if present (exact folder only). Apply resolved answers; skip the corresponding questions.

2. **Language resolution** via rule 4 + 4a. Auto-detect using the expanded signal table; ask only if signals split. Persist via rule 9.

3. **Persona sharpening.** If persona is "user" / "customer" / "person", ask via `AskUserQuestion` for a specific role. Generic personas hide motivation.

4. **Passive-goal check (rule G).** If `I want to` is observational AND `so that` lacks downstream action → ask once.

5. **Gap-check.** For each weak/missing section:
   - **Blocking** (changes scope, AC outcome, or persona) → `AskUserQuestion` immediately (batched ≤4).
   - **Non-blocking** (additive detail) → fill inline marked `⚠️ Assumed: <text>`. Do not ask.

6. **Sibling reference check.** If unlinked references found → ask once. If user opts for tentative slugs, apply rule F. Persist via rule 9.

7. **Deterministic pre-split test.** Apply the table above mechanically.
   - Count ≤1 → continue to step 8 (single-story path).
   - Count ≥2 → execute the **host skill's split behavior** (see Source-specific differential in each top-level skill).

8. **Fill the canonical block** (Use Case + AC + Design Ref + INVEST). Preserve original wording where it was already good. NEVER invent NFR/edge-case/deps sections **in the PM story body** — rule 3 still holds for `story.standard.md` / `story.jira-wiki.md`.

8b. **Gather dev-file enrichment** (feeds `story.dev.md` only — see rule 3a). Invoke the enrichment components to populate the technical sections of the dev file:
   - `[[edge-cases]]` → `### Edge Cases` (technical failure axes)
   - `[[risks-and-dependencies]]` → `### Dependencias` + `### Riesgos`
   - `[[analytics-events]]` → `### Analytics / Eventos`
   - `[[definition-of-done]]` → full DoD with CLI commands (PM files get the acceptance-only projection)
   - `[[business-rules]]` → policy invariants (also an *optional* PM section per `[[jira-wiki-formatter]]` when non-empty)
   None of these may appear in the PM story body except the optional Business Rules section. Skip any component whose output is empty (drop empty sections — rule 3 / jira-wiki-formatter).

9. **Run INVEST** via `[[invest-checklist]]`.
   - `READY` → render.
   - `SPLIT RECOMMENDED` → host-skill split behavior + rule 10 matrix + rule 11 V audit.
   - `NEEDS REFINEMENT` → iterate failing dimension, max 1 cycle, then STOP.
   - `NOT A STORY` → tell user it's a tech task and stop.

10. **Render** via `[[jira-wiki-formatter]]`.
    - Derive the output folder: `docs/storywright/YYYY-MM-DD-HHmm-<title-slug>/` where `YYYY-MM-DD-HHmm` is the current local date+time and `<title-slug>` is the story title in kebab-case (max 5 words, drop articles/prepositions).
    - Use the `Write` tool to persist three files to that folder (create it if it does not exist):
      - `story.standard.md` — PM-facing CommonMark, no technical detail
      - `story.jira-wiki.md` — PM-facing Jira wiki markup, no technical detail
      - `story.dev.md` — dev-facing CommonMark, full technical detail (file paths, imports, technical edge cases, full DoD with commands)
    - Emit `story.standard.md` and `story.jira-wiki.md` as fenced code blocks in chat. Do NOT emit `story.dev.md` in chat.
    - Write `.storywright-context.json` to the same folder.
    - Never ask whether to save — always write all four files.

11. **Log** ≤3 bullets (≤5 if SPLIT) appended at story end. Log type label is host-specific (Generation / Refinement / Split).

## What each top-level skill adds on top of this base

Only these three things vary:

| Skill | Source | Split behavior |
|---|---|---|
| `story-generate` | Raw prompt / ambiguous text + optional image/Figma | If pre-split count ≥2 → STOP, recommend `/story-split`. Otherwise draft 1 story. |
| `story-refine` | Existing story text + optional image/Figma | If pre-split count ≥2 → STOP, recommend `/story-split`. Otherwise fix in place. |
| `story-split` | Oversize story (any source) | Always produces epic + N children. Mechanical NxN matrix + per-child V audit MANDATORY. Recursive re-split per child if count ≥2. |
| `story-from-figma` | Figma file/page/frame URL (+ optional companion text) | One story per logical user-goal flow. Multi-flow output → mandatory `flow-summary.md` with mechanical matrix + V audit. Any flow with count ≥2 → hand off to `[[story-split]]`. |

Everything else is identical and lives in this base.

## Common Pitfalls (all skills)

- Writing any sidecar question file (clarifications.md, questions.md, etc).
- Announcing "Clarification resolved" or "no clarifications.md needed" instead of proceeding silently.
- Offering to save a clarifications file to disk after resolving gaps.
- Skipping rule 1 (terminal-only) "because the user is async".
- Eyeballing outcome counts instead of running the mechanical table.
- Renumbering ACs the team may already reference externally.
- Adding NFR/edge-cases sections "to be thorough".
- Tagging every visual claim instead of using the single Design Reference banner.
- Claiming children Independent without running the rule 10 matrix.
- Letting stylistic/UI-fragment children survive (rule 11 should have flagged them).
- Asking for a downstream action and then not strengthening the `so that`.
- Re-asking questions already answered in `.storywright-context.json`.
- Reading `.storywright-context.json` from a sibling or parent folder.

## References

- [[invest-checklist]]
- [[acceptance-criteria]]
- [[clarification-questions]]
- [[jira-wiki-formatter]]
- [[story-generate]]
- [[story-refine]]
- [[story-split]]
- [[story-from-figma]]

<claude-specific>
- Treat every rule above as load-bearing across all top-level skills.
- Use extended thinking when applying rule 10 (parse Given lines) and rule 11 (V audit per child).
- Never call Write for any sidecar question file. Use `AskUserQuestion`.
- Read `.storywright-context.json` ONLY from the exact target output folder.
- When you find yourself about to add an NFR / edge-cases / dependencies prose section to a story body, STOP — rule 3 forbids it.
</claude-specific>

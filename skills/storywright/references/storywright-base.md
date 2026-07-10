## Purpose

Every top-level storywright skill must behave identically except for three things:

1. **Source** — what the input is (raw prompt / existing story / oversize story / multi-item backlog).
2. **Prompt** — what the user is asking for.
3. **Split behavior** — whether the skill produces 1 story, recommends a split, or produces N stories directly.

Everything else (how to ask questions, what shape the output takes, how to detect language, how to count outcomes, how to flag dependencies, how to persist context) lives here.

If you are reading this through the router skill, treat every rule below as non-negotiable for every intent too.

## Hard rules (v2.2 — apply to all storywright intents)

1. **Host-agnostic clarifications.** Ask clarification questions via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code), batched ≤4 per call. If the host has no interactive clarification mechanism, write `clarifications.md` as a fallback rather than dropping the questions. Non-blocking gaps → mark `⚠️ Assumed: <text>` inline in the story body — do not ask. Do NOT announce the presence or absence of a clarifications file ("Clarification resolved", "no clarifications.md needed", or any equivalent). Silence = no questions. Proceed directly.

2. **Cohn + Gherkin canonical.** Every story (or child story) has:
   - ONE Use Case block (`As a / I want to / so that`).
   - ONE AC Scenario (one Given chain + one `When` + one `Then`).
   If the input naturally needs >1 `When`/`Then`, the skill MUST stop the single-story path and route to the split intent.

3. **No mini-PRDs in the PM story body.** PROHIBITED in `story.standard.md`:
   - Non-Functional Requirements blocks (a11y/i18n/perf/tokens) — DoD only.
   - Edge Cases enumerated as their own section — fold into AC failure paths.
   - Dependencies as prose — Jira ticket links only.
   - Per-claim visual specs (pixel measurements, hex inferences) inline — use single banner (rule 5).
   - Logs >3 lines (>5 if SPLIT verdict).

3a. **Technical detail lives in `story.dev.md`.** The content rule 3 bans from the PM body is NOT discarded — it is rendered in the dev-facing file. Edge cases, analytics events, risks/dependencies, technical considerations, and the command-level DoD belong in `story.dev.md`, populated by the enrichment components (Application step 8b). The PM↔dev split is the home for this content; rule 3 governs the PM file, `story.dev.md` carries the technical detail. See `references/story-formatter.md` for the audience table.

**The epic is a PM↔dev duo too.** The split intent's epic output follows the same PM↔dev split as every story: `epic.standard.md` (PM-facing — Objective/Hypothesis, Business Outcome(s), In/Out of scope, Core complexity) + `epic.dev.md` (dev-facing — Why split, Patterns, Cynefin, children table, dependency matrix, build order, V audit, Notes). Business Outcome(s) in `epic.standard.md` MUST be marked `⚠️ Assumed:` — it is inferred from the prompt, never a verified figure (hard rule 14 applies to the epic exactly as it applies to every story).

4. **Output language matches the user's chat language**, not the input's. Auto-detect first via rule 4a; only ask via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code) if signals split.

5. **Visual inference confidence — single banner only.** Do NOT tag every visual claim. ONE banner at the top of the Design Reference block declares source type; all claims under it inherit:
   - Raster source (PNG/JPG) → `**Source: raster mockup → all visual specs are pixel-derived, not token-confirmed.**`
   - Design-token source → `**Source: design tokens → values are authoritative.**`
   Never assert hex / px / spacing from raster without the raster banner.

6. **Sibling task IDs.** If the story references "next task / future task / another story / siblings" — check `<output-folder>/.storywright-context.json` first. If unresolved, ask via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code). If user has none yet, leave `TODO: link sibling` (unless rule F applies — invent slug per persisted naming pattern).

7. **Mockup chrome detection — closed list.** Chrome = exactly:
   - left nav rail / sidebar
   - top bar (user menu, global breadcrumbs, global search)
   - footer
   - persistent toast/snackbar slot
   - persistent modal scrim
   - app-level tabs

   If a companion image shows any of these AND the input does not mention them, ask via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code) whether each is `in-scope`, `sibling-scope`, or `out-of-scope`. Anything not on this list (cards, section headers, in-flow buttons) is NOT chrome — do not surface as a chrome question.

8. **Anti-PRD is part of INVEST `Small`, not a separate step.** See `references/invest-checklist.md` Small criterion — line-count ceiling (~60 lines) lives there. Single source of truth.

9. **Cross-skill context persistence.** When any storywright intent resolves a clarification via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code), write the **answer** to `<output-folder>/.storywright-context.json`. Read only from the exact output folder of the current invocation; never search siblings or parents. Schema:

   ```json
   {
     "version": 1,
     "decided_at": "<ISO date>",
     "decided_by_skill": "story-generate | story-refine | story-split | story-batch",
     "language": "EN | ES | ...",
     "chrome_scope": "in-scope | in-scope-placeholder | sibling | out-of-scope",
     "siblings": "TODO | <list of IDs> | not-applicable",
     "design_source": "raster | tokens",
     "naming_pattern": "kebab-feature-action | verb-noun | domain-action | jira-prefix",
     "extra": {}
   }
   ```

   Every intent MUST read this file BEFORE asking any question. Every intent MUST write this file when it resolves a question.

10. **Children independence — mechanical detection (rule A).** When any intent produces multiple stories or children (split, batch multi-item, refine recommending split):
    - For each child Cj, parse its `Given:` and `and Given:` lines.
    - If any Given text contains a surface noun owned by child Ci (Ci's title/scope owns "grid" and Cj's Given mentions "the grid") → mark `DEP(Cj → Ci)`.
    - The dependency map IS the union of those text matches. **Do not add deps "you sense" without a Given citation.**
    - Affected child's INVEST `Independent` becomes `PARTIAL · depends on <Ci>`.
    - Parent epic / flow-summary file lists explicit build order (topological sort of the matrix).
    - **Deterministic tie-break (makes the build order a total order).** The topological sort of the NxN matrix is the PRIMARY key. When two or more children are equally unblocked at the same dependency depth, break the tie with these keys, in order, using ONLY signals already computable from the matrix and the Split Plan (no new signal is introduced):
      - **Secondary — ascending dependency fan-in.** Count how many other children depend ON each tied child (its fan-in in the matrix). The child with FEWER dependents sorts earlier.
      - **Tertiary — Split-Plan proposal order.** If fan-in is still tied, sort by the child's row order in the approved Split Plan table (`#### split` step 3) — the stable, author-declared order.
      - V-audit strength (PASS/WEAK) MUST NOT be used as a tie-break key — it is a qualitative verdict, not an ordering signal.
    - If a dep is real but no Given mentions it, rewrite the child's Given to make it explicit, then re-run the match. Intuition-based deps are forbidden.

11. **Per-child V audit (rule C).** After any split-style output, for each candidate child run a one-line test:
    "If only this child ships and no sibling exists, does a real user complete a real task?"
    - If yes → V = PASS.
    - If no, useless until `<other>` ships → V = `WEAK · merge-upstream-candidate`. Recommend merging into the parent surface instead of keeping standalone.
    Do not let stylistic/UI-fragment children survive a split.

12. **Passive-goal downstream prompt (rule G).** If the story's `I want to` verb is observational (`view, see, read, browse, look at, inspect, monitor`) AND the `so that` does not name a follow-up user action — ask once via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code): "What does the user do with this?". Strengthen the `so that` accordingly. Skip if `so that` already names a downstream action.

13. **PM section whitelist (rule H).** Only these section names may appear in `story.standard.md`:

    **ALLOWED:** User Story, Acceptance Criteria, Definition of Done, Contexto, Business Goal, Scope, Out of Scope, Business Rules. (`**Summary:**` is inline text, not a section heading — it is not subject to this list.)

    **ALLOWED, scoped to `epic.standard.md` only** (these four do NOT extend `story.standard.md`'s whitelist above): Objective / Hypothesis, Business Outcome(s), In / Out of scope, Core complexity.

    **BANNED** (move content to `story.dev.md`, never emit in PM files): Edge Cases, Non-Functional Requirements, NFR, Performance, Security, Accessibility, Technical Considerations, Analytics, Risks, Dependencies, Dependencias, Riesgos, Estimate, Story Points — and any section whose name does not appear in an ALLOWED list above.

    If you find yourself writing a banned section into a PM file, stop. Move its content to `story.dev.md` instead (use `## Technical Considerations` as the target heading for Accessibility, Performance, and Security content). Do not silently drop it.

14. **Project-less by design — never ground in the open repo.** storywright generates a forward contract for work that often does not exist yet; it is NOT a code-analysis tool. Do NOT read, scan, or infer from the files of any repository open in the session, even if they appear relevant. All technical detail in `story.dev.md` (endpoints, components, file paths, library choices) is **inferred from domain knowledge**, not read from a codebase. Mark any non-obvious technical inference with `⚠️ Assumed:` so the developer treats it as a starting point, not verified fact. Grounding silently against an open repo makes output non-deterministic (the same prompt yields different stories depending on what files happen to be open) and gives false confidence that inferred specifics were verified — neither is acceptable. If the user explicitly wants the story grounded in real code, that is out of scope: tell them to confirm the specifics against the codebase themselves.

### 4a. Language auto-detect — expanded signals (rule E)

Run cheap detection before asking. Multi-signal weighted decision:

| Signal | Where to look | Weight |
|---|---|---|
| Gherkin keywords in M ("Given/When/Then") | AC block | high |
| Persona phrasing in M ("As a user" vs "Como un usuario") | Use Case | high |
| Column / field names in M ("Phone - primary", "Teléfono - principal") | AC bullets | medium |
| Domain verbs in M ("clicking" vs "hacer clic") | AC bullets | medium |
| Title language | header | low |

**Decision:**
- All high+medium signals agree on language M → adopt M silently. Mark inline `⚠️ Assumed: output language = <M> (auto-detected from <signals>)`.
- Signals split → ask once via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code).
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

When any intent needs to invent a tentative ticket slug AND `.storywright-context.json` has no `naming_pattern` field, ask once via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code):

```
Which naming pattern do you use for tickets?
- kebab-case feature-action      → "customer-search-bar-wire"
- verb-noun                       → "wire-search-bar"
- domain-action                   → "search.customer.wire-input"
- Jira prefix + numeric           → "CSB-001"
```

Persist in `naming_pattern`. Use for all sibling slugs in this run AND future intents reading the same context file.

### Rule I. Title slug — shared, named rule (promoted from the single-story render step)

Every storywright output that needs a filesystem-safe slug derived from a title (single-story folder + filename, split epic folder, split child filenames, batch item filenames, batch folder) MUST use this rule. No consumer re-derives its own slug logic or silently inherits an unnamed convention — cite Rule I by name.

**Derivation, in order:**
1. **Fold diacritics to ASCII.** `Código` → `codigo`, `Iniciar sesión` → `Iniciar sesion`.
2. **Lowercase and kebab-case.** Replace spaces/punctuation with single hyphens.
3. **Drop stop-words**, in this enumerated order (no "and equivalents" catch-all — additional languages get their own explicit entry when added):
   - Articles and prepositions (unchanged from the pre-promotion behavior): EN `a`, `an`, `the`, `of`, `in`, `on`, `for`, `to`, `with`; ES `el`, `la`, `los`, `las`, `un`, `una`, `de`, `en`, `del`, `dentro`, `con`, `antes`, `para`.
   - **Coordinating conjunctions (NEW):** EN `and`, `or`; ES `y`, `o`, `e`, `u`; ampersand `&` (any language).
   - **Positional constraint on the conjunction drop (mechanical, not phonetic):** `e`/`u`/`y`/`o`/`and`/`or`/`&` are dropped ONLY when the token is a standalone coordinating token strictly BETWEEN two other retained tokens — i.e. it is neither the first nor the last token of the title, and both immediate neighbors are retained content words. A single-letter token `e` or `u` that is the FIRST or LAST token of the title is NEVER dropped under this rule. This replaces any phonetic condition ("`e` before an /i/-sound word") with a mechanical position check.
4. **Preserve source word order.** Do not reorder tokens after dropping stop-words.
5. **Truncate to ≤5 words**, counted AFTER all drops in step 3.

**Enumeration cap-exemption (applies ONLY to step 5, POST-drop, POST-word-order).** When the title is a coordinated enumeration whose listed items ARE the child's actual scope (e.g. "Export to CSV, PDF, and Excel" — the formats named are what the child does), the ≤5-word cap in step 5 MUST NOT silently drop enumerated items. Keep the full enumeration in the slug instead of truncating it away. This exemption modifies step 5's truncation ONLY: it does not re-order tokens (step 4 still holds), does not change the drop-list (step 3's articles/prepositions list is unchanged), and does not touch the positional conjunction-drop rule (`e`/`u`/`y`/`o`/`and`/`or`/`&`, step 3, still fires exactly as specified). Example: "Export to CSV, PDF, and Excel" → drop preposition `to` and conjunction `and` (interior, positional rule intact) → preserve word order → `export-csv-pdf-excel` (4 words after drops, so the cap does not even engage here; for a longer enumeration that WOULD exceed 5 words after drops, keep every enumerated item rather than truncate — do not silently drop trailing items like "Excel").

**Cross-path impact.** This rule is cited, not restated, by every consumer:
- single-story output folder + filenames (Application step 10, below) — previously an inline, single-story-scoped clause; now a citation of Rule I.
- split epic folder slug (`-epic-<slug>/`, below) and split child filenames (`NN-<slug>`, `SKILL.md` `#### split`).
- batch item filenames (`NN-<slug>`, `SKILL.md` `#### batch` Phase 3) and batch folder slug (`SKILL.md` `#### batch` Phase 0, unaffected in derivation but cites Rule I for consistency).

Example: "Ver y filtrar el dashboard" → drop conjunction `y` (interior, between `Ver` and `filtrar`) → `ver-filtrar-dashboard`. Example: "Login con Google" → drop preposition `con` → preserve source word order (do not reverse the tokens) → `login-google`.

### Deterministic pre-split test (used by all intents)

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
- Count ≥2 → STOP single-story path. Route to split behavior per the host intent (switch to the split intent, produce epic+children, or recurse).

## Canonical output shape (this is the WHOLE story — no exceptions)

> **Note:** This block shows the *section taxonomy and rules* — not heading levels or exact markup. The rendered artifact must follow the `templates/` files exactly: `#` for title, `##` for sections (CommonMark). INVEST is a **process step** — it informs the Verdict line in the log but is NOT emitted as a section in the output artifact.

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
**AC-1: [single-outcome scenario name]**
- **Given:** [context — surface nouns here drive dep matrix per rule 10]
- **and Given:** [context]
- **When:** [single trigger]
- **Then:** [single observable outcome]

#### Design Reference (optional)
**Source: <raster | tokens> → <banner from rule 5>**
- [link or path]
- visual notes: [...]

#### <Generation | Refinement | Split> log (≤3 lines; ≤5 if SPLIT verdict)
- INVEST Verdict: <READY | SPLIT RECOMMENDED | NEEDS REFINEMENT | NOT A STORY>
- [other changes]
```

NOTHING else. No NFR block. No Edge Cases enumeration. No Dependencies prose. No Assumptions block (assumptions get `⚠️ Assumed` inline or are resolved via the host's interactive clarification mechanism, e.g. `AskUserQuestion` on Claude Code). No standalone INVEST section — verdict belongs in the log only.

**Title — no story-number prefix.** The title is the bare story name. NEVER prefix it with a story/sequence number (`Historia 00 —`, `Story 3:`, `HU-01 -`, or any equivalent). Sequence belongs in the ticket ID / filename, not the heading. One title heading, one scheme, every file.

**AC numbering — one scheme only: `AC-N`.** Every acceptance criterion is labelled `**AC-1:**`, `**AC-2:**`, … in ALL output files and ALL languages — never `CA-01`, `Criterio 1`, `Escenario 1`, or any localized variant. The label `AC` is fixed; only the scenario title after it is translated. Numbering is stable: append, never renumber existing ACs across iterations (see `references/acceptance-criteria.md`).

## Application (step-by-step — every intent follows this skeleton)

0. **Detect companion sources** (image, accompanying text). Run conflict detection against the primary input. Run chrome detection using rule 7. Surface conflicts as a BLOCKING question via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code).

1. **Read prior context.** Load `<output-folder>/.storywright-context.json` if present (exact folder only). Apply resolved answers; skip the corresponding questions.

2. **Language resolution** via rule 4 + 4a. Auto-detect using the expanded signal table; ask only if signals split. Persist via rule 9.

3. **Persona sharpening.** If persona is "user" / "customer" / "person", ask via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code) for a specific role. Generic personas hide motivation.

4. **Passive-goal check (rule G).** If `I want to` is observational AND `so that` lacks downstream action → ask once.

5. **Gap-check.** For each weak/missing section:
   - **Blocking** (changes scope, AC outcome, or persona) → ask immediately via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code), batched ≤4.
   - **Non-blocking** (additive detail) → fill inline marked `⚠️ Assumed: <text>`. Do not ask.

6. **Sibling reference check.** If unlinked references found → ask once. If user opts for tentative slugs, apply rule F. Persist via rule 9.

   **Flat folder, no per-child subfolders.** Split and batch output folders stay flat — all `epic.*` files, all `NN-<slug>.*` child/item files, and exactly one `.storywright-context.json` live at the folder root. Per-child subfolders are explicitly rejected: they would break the single-context-file rule (rule 9), sibling links (this step), and split↔batch folder uniformity.

7. **Deterministic pre-split test.** Apply the table above mechanically.
   - Count ≤1 → continue to step 8 (single-story path).
   - Count ≥2 → execute the **host intent's split behavior** (see Source-specific differential in each `#### <intent>` subsection).

8. **Fill the canonical block** (Use Case + AC + Design Ref + INVEST). Preserve original wording where it was already good. NEVER invent NFR/edge-case/deps sections **in the PM story body** — rule 3 still holds for `story.standard.md`.

   **Summary line (mandatory).** Generate `**Summary:**` immediately after the title — one sentence, value-focused, no heading. This line is MANDATORY in both output files. Format: `**Summary:** <sentence>`. Never omit it.

   **Covers the epic duo too.** "Both output files" means every `.standard`/`.dev` pair this skill emits — including the `split` intent's epic duo (`epic.standard.md` + `epic.dev.md`). The epic follows the same PM↔dev split as every story (rule 3a), so it inherits this Summary mandate on the same consistency grounds: `epic.standard.md` and `epic.dev.md` each carry a `**Summary:**` line immediately after the `# Epic — <name>` title, one sentence, PM-safe (business language, no technical detail) in `epic.standard.md`. Never omit it for the epic just because it is not a single story.

   The Summary MUST open with WHAT the deliverable is and WHICH problem it solves, in business language. The rule 3 / rule H ban on technical detail (file paths, imports, component/CLI names) does NOT exempt you from explaining the purpose — "no technical names" means no jargon, NOT "no explanation of what it does." Strip the jargon, keep the purpose.

   **For enabling / infra / platform stories this is mandatory and load-bearing.** When the deliverable is plumbing (publishing packages, provisioning a registry, setting up a pipeline, wiring shared config), describing only the process (publish / setup / install) is INSUFFICIENT — a PM reading it must understand what each artifact is FOR and what breaks downstream without it. State the consumer value, not the mechanics. Example: "publish 2 shared packages to a private registry" → the Summary explains what each package does and what stops working if it is missing, never just the publish/install cycle.

8.5. **PM section self-audit (rule H).** Before calling `references/story-formatter.md`, enumerate every section drafted for the PM file. For each section name:
     - In Rule H ALLOWED list → keep.
     - In Rule H BANNED list → move its content to `story.dev.md`.
     - Not in either list → treat as BANNED, move to `story.dev.md`.
     Log any moves in the Refinement Log: "Moved <Section> to dev (rule H)."
     Do not proceed to step 8b until the PM draft contains only ALLOWED sections.

8b. **Gather dev-file enrichment** (feeds `story.dev.md` only — see rule 3a). Invoke the enrichment references to populate the technical sections of the dev file:
   - `references/edge-cases.md` → `### Edge Cases` (technical failure axes)
   - `references/risks-and-dependencies.md` → `### Dependencias` + `### Riesgos`
   - `references/analytics-events.md` → `### Analytics / Eventos`
   - `references/definition-of-done.md` → full DoD with CLI commands (PM files get the acceptance-only projection)
   - `references/business-rules.md` → policy invariants (also an *optional* PM section per `references/story-formatter.md` when non-empty)
   None of these may appear in the PM story body except the optional Business Rules section (see Rule H for the full PM section whitelist). Skip any component whose output is empty (drop empty sections — rule 3).

9. **Run INVEST** via `references/invest-checklist.md`.
   - `READY` → render.
   - `SPLIT RECOMMENDED` → host-intent split behavior + rule 10 matrix + rule 11 V audit.
   - `NEEDS REFINEMENT` → iterate failing dimension, max 1 cycle, then STOP.
   - `NOT A STORY` → tell user it's a tech task and stop.

8c. **Estimate** via `references/estimation.md`. (Runs AFTER step 9 — requires the INVEST E verdict.)
    1. Read the step-9 INVEST E verdict.
    2. If `E — FAIL` → emit Spike block in `story.dev.md`; skip formula.
    3. Else: read 6 signals across both drafts (`ac_count` + `rule_count` from `story.standard.md`; `edge_count` + `dep_count` + `risk_hh_count` from `story.dev.md`).
    4. Run formula: `raw = AC×1.0 + edge×0.6 + dep×1.5 + 🚨×2.0 + rules×0.5`.
    5. Map raw to Fibonacci bucket (≤1.5→1, ≤3.5→2, ≤7→3, ≤12.5→5, ≤18→8, >18→13).
    6. Apply ±1 LLM adjustment only with a named signal citation; no citation → deterministic bucket retained.
    7. Emit `## Estimate` section in `story.dev.md` only (after DoD, before generation log).
    8. If points = 13 → append `> ⚠️ Consider splitting:` advisory (advisory only; never auto-split).

10. **Render** via `references/story-formatter.md`.
    - Derive the output folder: `docs/storywright/YYYY-MM-DD-HHmm-<title-slug>/` where `YYYY-MM-DD-HHmm` is the current local date+time and `<title-slug>` is the story title slugged per **Rule I** (above).
    - **Folder-naming grammar (`DATE-<type>-<slug>`):** the type infix is absent for a single story (this step), `batch` for a backlog (`SKILL.md` `#### batch`), and `epic` for a split with children (below). This is the same clock convention (current local date+time) across all three.
    - **Epic title construction.** The `split` intent MUST author an epic title before deriving the folder. The epic title is the bare feature name the split covers (inferred from the input story's subject — e.g. input "Build the new dashboard" → epic title `New dashboard`); the split renders its `epic.standard.md`/`epic.dev.md` H1 as `# Epic — <name>` by convention. The `<name>` carries NO leading `Epic` token itself — the `Epic —` prefix is added by this render convention, not part of the name.
    - **Split/epic folder rule.** The `split` intent writes to `docs/storywright/YYYY-MM-DD-HHmm-epic-<slug>/`, where `<slug>` is the epic title (the `<name>` above) slugged per Rule I, **after stripping any leading `Epic —`, `Epic:`, or `Epic ` prefix (case-insensitive) — so the rule is robust whether the caller passes the bare `<name>` or the rendered `# Epic — <name>` H1.** Anti-stutter rationale: the rendered epic H1 reads `# Epic — <name>`; slugging that H1 without stripping the prefix first would produce `<slug> = epic-<name-slug>`, which combined with the `-epic-` infix yields a doubled `…-epic-epic-<name-slug>/` folder name. Strip first (no-op on a bare `<name>`), then slug: `# Epic — New dashboard` → stripped `New dashboard` → Rule I → `new-dashboard` → folder `…-epic-new-dashboard/` (no stutter).
    - Use the `Write` tool to persist both files to that folder (create it if it does not exist):
      - `story.standard.md` — PM-facing CommonMark, no technical detail
      - `story.dev.md` — dev-facing CommonMark, full technical detail (file paths, imports, technical edge cases, full DoD with commands)
    - Emit `story.standard.md` as a fenced code block in chat. Do NOT emit `story.dev.md` in chat.
    - Write `.storywright-context.json` to the same folder.
    - Never ask whether to save — always write both story files and the context JSON.

11. **Log** ≤3 bullets (≤5 if SPLIT) appended at story end. Log type label is host-specific (Generation / Refinement / Split).

## What each intent adds on top of this base

Only these three things vary:

| Intent | Source | Split behavior |
|---|---|---|
| `generate` | Raw prompt / ambiguous text + optional image | If pre-split count ≥2 → STOP, switch to the split intent. Otherwise draft 1 story. |
| `refine` | Existing story text + optional image | If pre-split count ≥2 → STOP, switch to the split intent. Otherwise fix in place. |
| `split` | Oversize story (any source) | Always produces epic + N children. Mechanical NxN matrix + per-child V audit MANDATORY. Recursive re-split per child if count ≥2. |
| `batch` | Multi-item backlog (+ optional companion text) | One story per backlog item. Multi-item output → mandatory `backlog-summary.md` with mechanical matrix + V audit. Any item with count ≥2 → mark `SPLIT RECOMMENDED` in `backlog-summary.md` and continue; NEVER auto-switch to the split intent. |

Everything else is identical and lives in this base.

## Common Pitfalls (all intents)

- Running step 8c (Estimate) before step 9 INVEST — E verdict not yet available; always run INVEST first.
- Matching bare `###` headings in dev.md for estimation signal extraction — use depth-agnostic `^#{2,3}` pattern; rendered goldens use H2 sections.
- Writing a sidecar question file (clarifications.md, questions.md, etc) when the host has an interactive clarification mechanism — the file is only the no-interactive-mechanism fallback.
- Announcing "Clarification resolved" or "no clarifications.md needed" instead of proceeding silently.
- Offering to save a clarifications file to disk after resolving gaps on a host that has an interactive clarification mechanism — the file is only the no-interactive-mechanism fallback, never an opt-in prompt.
- Skipping rule 1 (host-agnostic clarifications) "because the user is async".
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

- `references/invest-checklist.md`
- `references/acceptance-criteria.md`
- `references/clarification-questions.md`
- `references/story-formatter.md`
- the generate intent (this skill)
- the refine intent (this skill)
- the split intent (this skill)
- the batch intent (this skill)

<claude-specific>
- Treat every rule above as load-bearing across all intents.
- Use extended thinking when applying rule 10 (parse Given lines) and rule 11 (V audit per child).
- If the host has an interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code), use it — do not call Write for a sidecar question file when one is available.
- Read `.storywright-context.json` ONLY from the exact target output folder.
- When you find yourself about to add an NFR / edge-cases / dependencies prose section to a story body, STOP — rule 3 forbids it.
</claude-specific>

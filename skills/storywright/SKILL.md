---
name: storywright
description: Turn a prompt, screenshot, existing story, oversize story, or multi-item backlog into Cohn+Gherkin user stories. Routes to generate, refine, split, or batch by input.
trigger: "/storywright | /story-generate | /story-refine | /story-split | /story-batch | generate a user story | write a user story | turn this into a story | crear historia de usuario | refine this story | improve this story | refinar historia | this story is incomplete | I forgot to mention | add this to the story | one more requirement | me olvidé de mencionar | agregale a la historia | split this story | divide this story | dividir historia | this is too big | story batch | batch backlog | generate backlog | multiple stories at once | generar backlog | varias historias"
intent: Single install unit that routes by input intent to the generate/refine/split/batch flow and reads the matching references on demand. All rules live in references/storywright-base.md.
version: 3.0.0
inputs:
  - text
  - image
  - backlog-text
outputs:
  - story.standard.md
  - story.dev.md
  - NN-<slug>.standard.md
  - NN-<slug>.dev.md
  - epic.standard.md
  - epic.dev.md
  - backlog-summary.md
  - .storywright-context.json
---

## Purpose

Take whatever the PM has — a one-liner, a half-baked story, a screenshot, an existing story to amend, an oversize story to split, or a raw multi-item backlog — and produce Cohn+Gherkin user stories an engineer can pick up and ship without follow-up questions. Detects which of four intents applies (generate / refine / split / batch) and reads only the matching references.

## Application

Detect the intent (Routing below), then follow the base Application skeleton in `references/storywright-base.md` exactly, reading ONLY the references listed for the matched intent; each intent subsection carries only the source + split-behavior delta.

### Routing (dispatch)

Precedence when signals overlap (highest first):
1. Explicit intent instruction in the message — an `Intent: <generate|refine|split|batch>` line OR a bare intent token (`/story-split`, `/story-refine`, etc.). Either one is explicit intent selection; honor as-is, do NOT re-derive intent.
2. Explicit trigger PHRASE in the user message (natural-language phrase, not a slash token — e.g. "refine this story", "split this story").
3. Structural signal below.

When TWO structural signals fire at once (e.g. the input reads as BOTH an existing story AND a multi-item backlog, or an existing story AND an oversize-for-split), the router MUST NOT silently pick — raise ONE BLOCKING clarification via the host's interactive clarification mechanism (base rule 1) asking which flow the user wants, then route to the confirmed intent.

| Input signal | Intent | Then read (in order) |
|---|---|---|
| Ambiguous prompt / screenshot / one-liner, no existing story | generate | base → clarification-questions → acceptance-criteria → invest-checklist → business-rules → edge-cases → analytics-events → risks-and-dependencies → definition-of-done → story-formatter → estimation |
| An existing story to audit/amend (pasted text, prior story pair, or amendment phrase) | refine | (same set as generate) |
| A single oversize story / pre-split count ≥2 confirmed for split | split | invest-checklist (pre-split gate FIRST) → base → clarification-questions → acceptance-criteria → business-rules → edge-cases → analytics-events → risks-and-dependencies → definition-of-done → story-formatter → estimation |
| One raw multi-item backlog (numbered/bulleted/blocks/multi-goal prose) | batch | (same set as generate) |
| TWO structural signals fire → ambiguous | (blocked) | STOP — ONE blocking clarification (base rule 1); route only after the user confirms |

Base is always read — it owns the Application skeleton, pre-split test, dep matrix, V audit, INVEST, context schema, and PM↔dev split. Intent subsections below carry ONLY the source + split-behavior delta.

#### generate

- **Source:** raw / ambiguous text, optionally fused with a screenshot.
- **What changes vs base:** at intake the prompt may name only a feature; infer the implicit user goal via rule 3 (persona sharpening) + rule G (passive-goal check) of the base. Mixed inputs follow the base conflict-detection rule plus the source-priority table below.

**Mixed-input source priority (text + image)**

| Section | Primary | Secondary |
|---|---|---|
| User Story / Goal | Text | Image |
| Scope | Text | Image |
| UI Components / States | Image | Text |
| AC observable outcomes | Triangulate | — |

Conflicts → BLOCKING question via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code) per base rule 1.

**Split behavior differential.** If the base deterministic pre-split test returns count ≥2:
- **STOP drafting.** Output a terminal message listing candidate children + per-pair dep notes (base rule 10) + V audit (base rule 11).
- Ask via the host's interactive clarification mechanism: "This story has [N] independent flows. Run split now?" with options:
  - "Yes, split" → switch to the split intent (see `## Application` → `#### split`) inline (epic + children + .storywright-context.json).
  - "Continue without split" → proceed with single-story path (fill canonical block → INVEST → render both files).
  - "No, keep as-is" → stop. No output written.
- Do NOT silently auto-split without this confirmation.

If count ≤1, proceed with the base step-by-step Application skeleton (read context → language → persona → passive-goal → gap-check → siblings → fill canonical block → INVEST → render).

Follow the base Application skeleton in `references/storywright-base.md` exactly; this subsection is the delta only.

#### refine

- **Source:** an existing user story (text). May be vague, missing sections, or have hand-wavy ACs.
- **What changes vs base:**
  - **Preserve original wording** where it was already good. Refine is NOT regenerate — if the PM already wrote a sharp persona / goal / so-that, do not rephrase it.
  - **Don't renumber ACs** the team may already reference externally. Append new content, don't shuffle.
  - **Detect which sections are present / missing / weak** before applying the base canonical block. Fill only what's weak; leave good sections alone.
  - If a companion image is attached, base conflict-detection applies. Story text is canonical for `User Story / Scope / Business value`; the image is canonical for `component names / observable states` referenced in AC.

**Amendment differential.**
- **Detection:** the full classification rule (two-path test, accepted story sources, ambiguity fallback) is stated in the numbered **Step R** below — not duplicated here. This covers only what happens once Step R has already selected the Amendment path: merge, conflict, and re-run semantics.
- **Merge-not-regenerate (on the Amendment path):** fold the delta into the parsed story BEFORE base step 5 (gap-check), so base steps 5–11 operate on the merged story. Preserve all existing wording not directly contradicted or extended by the delta — the "preserve original wording" rule applies unchanged; Amendment mode gets no weaker preservation rule. New ACs introduced by the delta are **appended** at the next unused `AC-N` (base AC-numbering rule, unchanged) — never renumber, reorder, or reuse existing AC numbers. If the delta only narrowly extends an existing AC's scope (e.g. a qualifier on an existing Given), editing that AC's text in place is permitted instead of appending a new one; log the edit either way (see Refinement log below).
- **Conflict-as-BLOCKING:** if the delta contradicts existing story content (Use Case, Preconditions, Business Rules, or an existing AC's Given/When/Then), this generalizes base step 0's conflict pattern (today used for image vs text) to story-vs-delta. Raise ONE BLOCKING question via the host's interactive clarification mechanism, batched with any other blocking gaps in the same pass per base rule 1's ≤4-per-call cap, before merging any contradicted content. Never silently prefer the existing story or the delta. Persist the resolution to `.storywright-context.json`'s existing `extra` field (base rule 9) — no new schema field. Only the contradicted content blocks; independent delta content proceeds through normal merge unless it causally depends on the contradicted content's resolution.
- **Mandatory pre-split re-run:** after merge and any conflict resolution, run the base deterministic pre-split test (base Application step 7) on the **merged** story, not the original. A prior pre-split pass on the pre-amendment story does not carry over — this is the load-bearing anti-silent-scope-growth guarantee. Count ≥2 fires the Split behavior differential below unchanged (no new split-decision options, no auto-split).
- **Re-render + refresh estimate:** when merged pre-split count ≤1, run base step 9 (INVEST), base step 8c (Estimate — re-run on the merged story, never carried over even if the verdict is unchanged), and base step 10 (render) exactly as for plain refine. Both `story.standard.md` and `story.dev.md` are re-rendered in full, not patched.
- **Project-less restatement (base rule 14):** the delta comes only from the user's message. Never read, scan, or infer the delta's content from the open repository, even to "verify" it. Technical inference stays marked `⚠️ Assumed:`.

**Split behavior differential.** If the base deterministic pre-split test returns count ≥2:
- **STOP refining.** Show candidate children + per-pair dep notes (base rule 10) + V audit (base rule 11).
- Ask via the host's interactive clarification mechanism: "This story has [N] independent flows. Run split now?" with options:
  - "Yes, split" → switch to the split intent (see `## Application` → `#### split`) inline (epic + children + .storywright-context.json).
  - "Continue without split" → proceed with single-story path (fill canonical block → INVEST → render both files).
  - "No, keep as-is" → stop. No output written.
- Do NOT silently auto-split without this confirmation.

If count ≤1, proceed with the base step-by-step Application skeleton, applying the source-specific preservation rules above.

**Refine-specific Application steps** (follow the base Application skeleton exactly, with one refine-local insertion):
1. **Step R (amendment detection — inserted after base step 1, before base step 2).** Classify the input into exactly ONE of two paths — **Amendment** or **Plain refine** — before any language/persona/gap branching runs. Accepted existing-story sources: (a) the story pasted as text in the message, (b) a prior `story.standard.md`/`story.dev.md` pair from an earlier run, (c) a reference resolvable via `.storywright-context.json` (base rule 9). The deciding predicate is phrase-agnostic: *is there a concrete requirement whose content is not already present in, or derivable by rephrasing, the existing story's Use Case / AC / Preconditions / Business Rules?* Yes → Amendment. No → Plain refine. Signal sources for "yes": an amendment trigger phrase (frontmatter `trigger`) is present, OR the user explicitly frames new content as an addition ("also", "additionally", "new requirement", equivalent Spanish framing) attached to sections not already covered by the story. An amendment trigger phrase alone is never sufficient — a phrase match with no actual new content beyond the existing story falls through to Plain refine, since there is no delta to merge. **Ambiguity fallback:** if the message could be read either way AND the ambiguity affects merge scope, raise ONE question via the host's interactive clarification mechanism per base rule 1's host-agnostic clarification mechanism, to disambiguate, decided case-by-case from the paired story content — never from a static "ambiguous phrases" list. This is a within-Step-R fallback, not a third path.
- Step 5 (gap-check): only fill **weak/missing** sections; leave sharp sections alone.
- Step 7 (pre-split test): on count ≥2 → STOP refining, switch to the split intent. On the Amendment path, this step runs on the **merged** story per the Amendment differential's mandatory re-run rule.
- Step 11 (log): label as "Refinement log". On the Amendment path, the log MUST still fit the base ≤3-line (≤5 if SPLIT) ceiling — achieve this by FOLDING, not by dropping records. All four records below are mandatory; they provably fit in 3 lines as shown:
  - Line 1 — base INVEST Verdict line (unchanged from base step 11).
  - Line 2 — `Amendment: <one-line delta summary> — <conflict status>`. Conflict status is either `no conflict` (fold inline, as shown) or, when a conflict was resolved, `Conflict: <what contradicted> — resolved: <resolution>` (this may fold into line 2 or take its own line if line 2 would otherwise be unreadable; either placement satisfies the ceiling since the total stays ≤3 lines).
  - Line 3 — `Estimate: <changed <old>→<new> | unchanged>` — the estimate-changed note, always present, on its own line or folded into line 2 if a conflict line pushed the count.
  The four records (amendment marker, delta summary, conflict status + resolution, estimate-changed note) are always mandatory on the Amendment path — folding is how they fit the ceiling, not a reason to omit one.

Follow the base Application skeleton in `references/storywright-base.md` exactly; this subsection is the delta only.

#### split

- **Source:** an oversize story (any prior source — generate / refine / batch may all hand off here). The story has failed INVEST on I, E, or S — OR the deterministic pre-split count is ≥2.
- **What changes vs base:** the skill does NOT produce a single story. It ALWAYS produces an epic + N children. Each child obeys the base canonical block. The user must approve the split plan before children are written.

**Split behavior differential.** This intent IS the split behavior. It always emits multiple files:
- **Epic duo** (title carries no story-number prefix, per the canonical title rule):
  - `epic.standard.md` — PM-facing: Objective/Hypothesis (1-3 sentence value-proposition statement), Business Outcome(s) (each `⚠️ Assumed:`, each labeled with a stable identifier — Outcome A/B or 1/2), In/Out of scope (the PM face of Deferred), Core complexity (business language only). Zero technical detail — same PM audience rules as `story.standard.md`, rendered per the epic-duo note in `references/story-formatter.md`.
  - `epic.dev.md` — dev-facing: Why split, Patterns applied, Cynefin domain, children table (+Pattern +V audit columns), mechanical NxN dependency matrix, build order, V audit per child, Notes (recursive re-split check, coherence check), and the dev↔value bridge (each child links to the Business Outcome it moves, cited by identifier only — e.g. "moves Outcome A" — never transcribing the outcome text).
  - **The duo ALWAYS emits once split starts — even with a single drafted child.** There is no ≥2-children precondition for the epic files; a round may draft one child and defer the rest to `epic.standard.md`'s In/Out-of-scope section.
- Per child: both files `NN-<slug>.standard.md` + `NN-<slug>.dev.md` (`NN` = zero-padded build-order ordinal; `<slug>` = the child title slugged per Rule I), rendered via `references/story-formatter.md` — same contract as every other intent. Each child is a canonical user story (per base shape).
- `.storywright-context.json` — persisted answers.

NO `split-plan.md`. The plan lives inside `epic.dev.md`.

**Pre-split gate (STOP conditions) — run BEFORE pattern selection.** Run `references/invest-checklist.md` first:
- **V FAILS** → STOP. Not a story. Combine with related user-facing work.
- **T FAILS** → fix in place via the refine intent (see `## Application` → `#### refine`).
- **N FAILS** → fix in place. Story is over-prescriptive, not too big.
- **E FAILS due to unknowns** → recommend a spike, not a split.
- **I / E (size) / S FAIL** → proceed to pattern selection.

**Pattern catalog (apply in order; stop at first that fits).** Humanizing Work methodology (Lawrence & Green).

1. **Workflow steps — thin end-to-end slices.** Each child delivers the FULL workflow with increasing sophistication. NOT step1/step2 of the journey.
   - ❌ Wrong: editorial / legal / publish.
   - ✅ Right: publish immediately. Story 2 adds editorial. Story 3 adds legal.
2. **CRUD operations.** "Manage" / "handle" / "maintain" → C/R/U/D.
3. **Business rule variations.** Same feature, different rules (members / VIP / first-time).
4. **Data type variations.** One story per data shape (jpg / pdf / mp4).
5. **Data entry / UI complexity.** Basic input first; fancy UI as follow-ups.
6. **Major effort.** First implementation does the heavy infrastructure lift.
7. **Simple / complex.** Strip variations from the core. Story 1 = simplest case that still delivers value.
8. **Defer performance.** Make-it-work before make-it-fast.
9. **Spike (last resort).** Time-boxed investigation. Not a story.

**Anti-patterns (NOT splits):** horizontal slicing (FE/BE), task decomposition, meaningless halves.

**Cynefin domain calibration:**
- **Obvious / Complicated** — enumerate all children, prioritize by value/risk.
- **Complex** — produce 1–2 learning stories; let usage teach the rest.
- **Chaotic** — defer splitting; stabilize first.

**Slicing-granularity heuristic (ties child count to the Cynefin domain signal, so the same input reliably yields the same child count).** This sharpens the calibration above — it does not replace it:
- **Complicated / Obvious signal:** the variations listed in the meta-pattern step below are individually well-understood and enumerable (each is a known problem — e.g. "export to CSV" is a known integration, not an open question) → enumerate ALL of them, one child per variation, bounded by the existing coherence check (step 10 below) and per-child V audit (rule 11).
- **Complex signal:** unknowns dominate — the variations can be named but their shape, users' actual need, or the right approach is still genuinely uncertain → draft only the **1–2 simplest complete vertical slice(s)** (learning stories) and defer the remaining named variations to `epic.standard.md`'s In/Out-of-scope section. Let real usage of the learning story(s) teach which of the deferred variations to build next, instead of guessing all of them up front.
- **Chaotic signal:** unchanged — defer splitting entirely, stabilize the situation first.
- **Explicitly OUT OF SCOPE — no mechanical/numeric Cynefin scorer.** The domain call (Obvious/Complicated/Complex/Chaotic) stays a qualitative judgment made by reading the variations, not an arithmetic classifier. Building a scoring formula would impose false precision on a genuinely qualitative sense-making call; if full mechanization is ever wanted, that is a separate future issue, not part of this heuristic.

**Meta-pattern (every pattern):**
1. Name the **core complexity** that makes the story big.
2. List **all variations** of that complexity.
3. Pick **one variation** as the simplest complete vertical slice.
4. Each other variation becomes its own story — but see the slicing-granularity heuristic above: on a Complex signal, only 1–2 variations get drafted as stories now, the rest are named and deferred, not silently authored into extra children.

**Split-specific Application steps** (follow the base Application skeleton for the front-end behaviors — context load, language, persona, passive-goal, gap-check, siblings; split-specific steps inserted after):

1. **Pre-split gate.** Run `references/invest-checklist.md`. Honor STOP conditions above.
2. **Pattern selection.** Apply catalog in order. Name first fit + core complexity + Cynefin domain. **Author each child's title now, from the meta-pattern's variations — do not slug yet.** Each variation named by the meta-pattern step ("each other variation becomes its own story") gets AUTHORED into a business-language child title (per the canonical title rule — no story-number prefix) BEFORE any slug derivation runs. Slugging (Rule I) happens later, in step 6, against these authored titles — never the other way around. Worked example: meta-pattern variation "searching within the dashboard" → authored title `Buscar dentro del dashboard` (the title that later becomes `02-buscar-dashboard` once Rule I slugs it in step 6).
3. **Draft split plan** as a terminal table (no file yet):
   ```
   ### Split Plan
   Rationale: <INVEST failure reasons>
   Core complexity: <meta-pattern>
   Pattern(s): <names>
   Cynefin: <domain>

   | # | Proposed child | Pattern | V audit (base rule 11) |
   |---|---|---|---|
   ```
4. **Strategic check before approval:** does the split reveal low-value work we can deprioritize? Are children roughly equal in size?
5. **STOP and ask the user to approve via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code).**
6. **For each approved child, write the base canonical block, then render via `references/story-formatter.md` to both files** (`NN-<slug>.standard.md` + `NN-<slug>.dev.md`, `NN` = zero-padded build-order ordinal, `<slug>` = the child's AUTHORED title from step 2, slugged via Rule I — the title is authored first, THEN slugged; slugging never runs against an un-authored variation name). The child's enrichment (edge cases, risks, analytics) populates its `NN-<slug>.dev.md` per base step 8b.
7. **Build dependency matrix mechanically (base rule 10).** Render in `epic.dev.md`.
8. **V audit per child (base rule 11).** Flag merge-upstream candidates in `epic.dev.md`.
9. **Recursive re-split check.** For each child, run the base deterministic counter. If count ≥2 → recursive split of that child. Surface the tree in `epic.dev.md`.
10. **Coherence check** — children together cover the original scope. Flag gaps or overlaps.
11. **Write `epic.dev.md`** with: why-split, Patterns, Cynefin, children table (+Pattern +V audit), matrix, build order, V audit, Notes (recursive re-split check, coherence check). **Write `epic.standard.md`** with: Objective/Hypothesis, Business Outcome(s) (`⚠️ Assumed:`, each with a stable identifier), In/Out of scope (from Deferred), Core complexity (business language, migrated — `epic.dev.md` keeps at most a one-line pointer, never the full section). **Emit the dev↔value bridge** in `epic.dev.md`'s children table or V-audit section — each child references the Business Outcome it moves, by identifier only.
12. **Persist context** to `.storywright-context.json` (`extra.split_pattern`, `extra.core_complexity`).

**Validate every child (must pass all 6):**
1. Delivers user value independently (V audit PASS).
2. Developable with explicit build order from the matrix.
3. Testable: single Given/When/Then with observable outcome.
4. Sprintable (1–5 days).
5. Union equals original scope.
6. ≤60 lines per child story (anti-PRD via base rule 8).

Follow the base Application skeleton in `references/storywright-base.md` exactly; this subsection is the delta only.

#### batch

- **Source:** one raw multi-item backlog (numbered list, bulleted list, blank-line-separated blocks, or prose with multiple goals).
- **What changes vs base:**
  - **Input is N items, not one item.** Structural parsing identifies item boundaries first; LLM fallback infers boundaries when structural signals are absent or ambiguous.
  - **Boundary confirmation is mandatory.** The skill presents the parsed item list and waits for user confirmation before proceeding (non-skippable).
  - **Cohesion gate runs before clarifications.** Items sharing persona or feature-area context are processed with a single shared clarification round; disparate items get per-item clarifications.
  - **Output uses `NN-<slug>.` prefix** (zero-padded 1-based item index + the per-item title slug per Rule I, applied to that item's own title) so all items share one flat batch folder without collisions.
  - **backlog-summary.md is the batch roll-up.** Carries INVEST verdicts, dep matrix, V audit, build order, cohesion verdict, and SPLIT RECOMMENDED markers across all items.

**Split behavior differential.** This intent produces **multiple stories in one invocation** (one per confirmed item). When N>1:
- **MANDATORY: emit `backlog-summary.md`** with cohesion verdict/%, per-story INVEST verdict, mechanical NxN dep matrix (base rule 10) parsed from each story's Given lines, per-story V audit (base rule 11) with merge-upstream flags, topological build order, SPLIT RECOMMENDED and NOT A STORY markers.

For any item whose deterministic pre-split count ≥2 → STOP that item's draft, mark it `SPLIT RECOMMENDED` in `backlog-summary.md`, and continue with the remaining items. NEVER auto-switch to the split intent.

For any item whose INVEST V dimension FAILS → mark it `NOT A STORY` in `backlog-summary.md`, emit no files, and continue. NEVER stop the batch.

If N=1 after boundary confirmation → abort and instruct the user to use the generate intent instead.

**Batch-specific Application steps** (follow the base Application skeleton for per-item story production — steps 3–11 per item; batch-specific steps below):

**Phase 0 — Parse, guard, and boundary confirmation**
1. Read prior context per base rule 9.
2. Apply structural parsing to the input: numbered lists → bullets → blank-line-separated blocks. Each structural unit is one candidate item.
3. **N=0 guard:** if the parsed item list is empty (zero items after structural parsing and LLM fallback), emit: "No items found — paste a numbered list, bulleted list, or blank-line-separated blocks and try again." Stop. No further phases run.
4. If structural parsing yields fewer than 2 items or ambiguous boundaries, invoke LLM segmentation: infer one item per distinct user goal expressed in the input.
5. **N=1 abort:** if after parsing exactly 1 item is identified, emit: "Only one item found — use the generate intent for a single story." Stop.
6. Present the parsed boundary list via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code): "I found N items — does this look right? Reply to confirm, merge two items, split one, or edit the list."
7. Apply any user corrections and re-present if the count changed. Proceed only after the user confirms.

**Folder-slug derivation (scoped to the batch FOLDER only):** derive the batch folder slug from the first item's inferred feature area. Lowercase, replace spaces with hyphens, truncate to ≤30 characters. No other slug rule applies to the folder slug — this is a separate, folder-only rule from the per-item filename slug below (Phase 3 step 2), which is a distinct rule introduced by this change and cites Rule I.

Example: first item "Add checkout summary page" → feature area "checkout" → slug `checkout`.

**Phase 1 — Cohesion gate.** Run the following deterministic algorithm before any clarification round:
- **Step A:** for each item i, extract `persona_i` (the primary actor noun, lowercase, singular; exclude generic terms: user, customer, usuario, cliente) and `area_i` (up to 2 highest-salience feature-area nouns in goal or verb-object position, e.g. "checkout", "cart", "authentication").
- **Step B:** items i and j **share context** when `persona_i ∩ persona_j ≠ ∅` OR `area_i ∩ area_j ≠ ∅`. Use stem/synonym matching (checkout/check-out, cart/basket). Build an undirected graph G with one edge per sharing pair.
- **Step C:** `cohesion% = |largest connected component| / N × 100`, rounded to the nearest integer.
- **Step D:** if `cohesion% ≥ 60` → **COHESIVE**; if `cohesion% < 60` → **DISPARATE**.
- **Step E:** announce the verdict inline as a blockquote (not a question):

  COHESIVE example:
  > ⚠️ Assumed: batch is cohesive (shared context: checkout / buyer, 80%, threshold 60%). Running one shared clarification round. Reply "per-item" to override.

  DISPARATE example:
  > ⚠️ Assumed: batch is disparate (no shared context detected, 40%, threshold 60%). Running per-item clarifications. Reply "cohesive" or "one round" to override.

If the PM replies with an override, honor it and re-announce the new mode before proceeding.

**Phase 2 — Clarification scope.**
- **COHESIVE batch:** run `references/clarification-questions.md` over the UNION of all items. Deduplicate overlapping questions. Ask at most 4 questions in one batched round. Persist answers via base rule 9. These answers seed `.storywright-context.json` so each item's base step 5 gap-check finds them pre-answered.
- **DISPARATE batch:** defer clarifications to per-item base step 5. Only infrastructure-level answers (output language, naming conventions, technical stack) are shared across items; content answers (persona, goal, AC specifics) stay per-item.

**Phase 3 — Per-item pipeline.** For each confirmed item (1-based index N):
1. Run base Application steps 3–11 verbatim (persona, passive-goal check, gap-check, pre-split count, canonical block, rule H audit, dev enrichment, INVEST, render duo, log).
2. **Per-item filename slug (NEW — batch has no per-item slug before this rule).** Derive `<slug>` by applying Rule I to THIS item's own title (not the folder slug from Phase 0, which stays feature-area-only). Use filename prefix `NN-<slug>.` where `NN` is the zero-padded 1-based item index (all items share one flat batch folder).
3. **Pre-split ≥2:** mark item as `SPLIT RECOMMENDED`, skip drafting the canonical block, emit no files. Continue to the next item.
4. **INVEST V = FAIL:** mark item as `NOT A STORY`, emit no files. Continue to the next item.
5. **INVEST other failures (T, N, E, I, S):** flag inline with `⚠️` in `backlog-summary.md` but still emit both files (base behavior).

Only items in `DRAFTED` status (step 10 logged) proceed to the Phase 4 matrix.

**Phase 4 — Cross-item analysis (N>1, DRAFTED items only).** Scope: only items that reached `DRAFTED` in Phase 3 participate in the matrix and V audit.
1. **Mechanical NxN matrix (base rule 10).** Parse each DRAFTED story's Given lines to detect dependencies.
2. **Per-story V audit (base rule 11).** Flag merge-upstream candidates.
3. **Topological build order.** Derive from the dependency matrix.

**Phase 5 — Output.** Story pairs are already written by Phase 3 step 10. Emit:
1. **`backlog-summary.md`** at the batch folder root when N>1 OR any item is SPLIT RECOMMENDED or NOT A STORY:

   ```
   # Backlog Summary — <slug>

   Generated: YYYY-MM-DD HH:mm
   Items: N
   Drafted: D (story pairs emitted)
   Split recommended: S (no story files — run the split intent per item)

   **Cohesion:** COHESIVE | DISPARATE (<cohesion%>, threshold 60%, driver: persona/area/both)

   ## Stories

   | # | Title | INVEST verdict | Independence |
   |---|-------|----------------|--------------|
   | 1 | ...   | PASS / FAIL(T) | ...          |

   ## Dependency matrix

   (base rule 10 — NxN over DRAFTED items only, with Given citations and build order)

   ## V audit

   (base rule 11 per DRAFTED item)

   ## Notes

   - Item N: SPLIT RECOMMENDED (pre-split count: X). Run the split intent on this item manually.
   - Item M: NOT A STORY (INVEST V = FAIL). Rework or discard.
   ```

   **GUARD — banned sections:** do not use headings that start with "Dependencies", "Dependencias", "Risks", or "Riesgos" — use "Dependency matrix" and "Notes" instead (base rule H).

   After `## Stories` and before `## Dependency matrix`, include a `## Backlog Estimate` section as a planning aid:

   ```
   ## Backlog Estimate

   | # | Title | Points | Key Driver |
   |---|-------|--------|------------|
   | 1 | ...   | 5      | 3 deps     |
   | 2 | ...   | —  (split first) | SPLIT RECOMMENDED |
   | 3 | ...   | Spike  | E = FAIL   |
   |   | **Total drafted** | **10 SP** | sum of numeric values only |
   ```

   Rules:
   - SPLIT RECOMMENDED items → `— (split first)` in Points column; `SPLIT RECOMMENDED` in Key Driver.
   - Spike items (INVEST E = FAIL) → `Spike` in Points; `E = FAIL` in Key Driver.
   - Total row sums only numeric point values; excludes `—` and `Spike` rows.
   - Full justification table stays in `NN-<slug>.dev.md`; only Points + Key Driver appear here.

2. **`.storywright-context.json`** updated per base rule 9 (one file per batch folder). No `clarifications.md` when the host has an interactive clarification mechanism.
3. **Flat folder structure:** all files in `storywright/YYYY-MM-DD-HHmm-batch-<slug>/` (at the project root) with no subdirectories. Slug derived per Phase 0 rule (first item's feature area, ≤30 chars, lowercase, hyphens).

NO `clarifications.md` when the host has an interactive clarification mechanism. NO Edge Cases / NFR sections **in PM files** (they live in `NN-<slug>.dev.md` per base rule 3a). NO per-claim visual tags.

Follow the base Application skeleton in `references/storywright-base.md` exactly; this subsection is the delta only.

## References

- `references/storywright-base.md` — the rulebook
- `references/clarification-questions.md`
- `references/business-rules.md`
- `references/acceptance-criteria.md`
- `references/edge-cases.md`
- `references/analytics-events.md`
- `references/risks-and-dependencies.md`
- `references/definition-of-done.md`
- `references/invest-checklist.md`
- `references/story-formatter.md`
- `references/estimation.md`

<claude-specific>
- Read `references/storywright-base.md` before applying. Do not duplicate its rules in your reasoning.
- For mixed inputs, attach images in the same message for native vision.
- Use extended thinking for INVEST, pre-split counting, and pattern selection.
</claude-specific>

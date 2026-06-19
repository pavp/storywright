# Roadmap

Planned features for storywright. Each entry states the user problem, the
approach (within the Markdown-pure, composition-based model), the cost, and the
design risk to watch. Nothing here is committed scope until it goes through SDD.

> **Guiding constraint:** every feature must respect the pack's non-goals
> (no Jira/Linear API in code, not project-aware, no long-term memory) and the
> central PM↔dev dual-output invariant. Features that fight the thesis are
> out — see [`storywright-master-context.md`](storywright-master-context.md).

---

## 1. `story-batch` — one invocation, N stories

**Problem.** Storywright is one-story-at-a-time. A PM arriving at a refinement
session with a raw backlog (8 bullets in a doc, a pasted Notion list) must
invoke `story-generate` once per item, copy-paste once per item, and answer each
story's clarifications in isolation — losing the shared context between sibling
stories.

**Approach.** A thin orchestrator skill, NOT a reimplementation. It:
1. Splits the input into N story candidates (one item per story).
2. Runs **one shared clarification round** for the batch, since stories from the
   same backlog usually share product, user, and business-rule context — the
   gain a human invoking N times loses.
3. Runs the existing pipeline per item: INVEST → deterministic pre-split check →
   render both files (standard + dev).
4. Emits a `backlog-summary.md` index mapping the N story pairs and flagging items
   that came back `SPLIT RECOMMENDED`.

**Why it fits.** Pure composition. The pack already does "N stories per
invocation + summary file" in `story-from-figma` (one story per flow +
`flow-summary.md`); batch generalizes that pattern to text input. It composes
the same components and delegates per-item to `story-generate`'s logic — it
duplicates no rules.

**Cost:** Low. Reuses a proven pipeline. The real work is input-to-items parsing
and the shared clarification round.

**Design risk.** The shared clarification round is double-edged: if the N stories
do NOT share context, asking once for all confuses. Needs a cohesion gate —
detect batch cohesion and fall back to per-item clarifications when items are
disparate. Do not over-automate away the PM's judgment.

---

## 2. `story-estimate` — relative sizing with justification

**Problem.** The PM ends up with an INVEST-valid story, mapped edge cases, and a
dependency matrix — then opens another tool (or guesses) to size it. The
complexity signal is **already generated and unused**.

**Approach.** Relative sizing, **never in hours** (hours are a false commitment;
the LLM cannot know team velocity). Relative size (T-shirt S/M/L/XL or Fibonacci)
compares complexity to complexity, derived from signals the pack already
produces:
- Number of acceptance criteria (more paths = bigger)
- Number of technical edge cases in `story.dev.md`
- Number of dependencies in the NxN matrix
- Number of business rules and their variations
- Inference confidence (LOW confidence = uncertainty = bigger)

Returns the estimate **with auditable justification**: "L because 6 edge cases,
2 upstream deps, 1 multi-variant business rule" — not a magic number, a reasoning
the PM can challenge in planning.

**Why it fits.** A new `estimation` component fed by the enrichment components
that already run (`edge-cases`, `risks-and-dependencies`, `acceptance-criteria`).
Output goes to `story.dev.md`, not the PM body — consistent with base rule 3a. It
leverages existing data; it invents none.

**Cost:** Medium. New component, but it synthesizes rather than invents. The work
is the rubric: which signal weighs how much, and keeping the LLM's numbers
consistent across stories.

**Design risk.** LLM estimation is slippery — the same story can read S today and
M tomorrow. Defense: anchor to **countable signals** (edge cases, deps are
numbers, not opinions) instead of feel, and frame it explicitly as a
*planning-conversation starting point*, never a verdict. Treated as gospel, it
does harm.

---

## 3. `grounded mode` — explicit project-aware story generation

**Problem.** Storywright is project-less by design (the only designed mode —
see master-context §6): dev-file specifics come from the model's domain
knowledge, not the repo. But when a user runs it with a repo open in Claude
Code, the agent **can** read project files and leak real specifics into the
story — **emergent, non-deterministic, undeclared** behavior. That is the worst
of both worlds: the dev believes the specifics were verified (they were not),
and the PM believes the story is portable (it no longer is). The same story
yields different output depending on what files happen to be open.

The real tension: grounding genuinely helps the **dev** (a story about *existing*
code — refactor, bug, extension — wants the real endpoint/component, not a
guess), but hurts the **PM** (a story about a *new* feature lives before the code
exists, and must stay portable). Two legitimate users, two lifecycle moments.

**Approach.** Make project-awareness an **explicit opt-in mode**, never a silent
leak. Default stays project-less. A `grounded` mode (intent flag on
`story-generate`) tells the agent to read the open repo and **mark provenance**
on every dev-file specific: `[verified: path]` (read from repo) vs `[inferred]`
(domain-knowledge guess). All grounded detail goes to `story.dev.md` only —
never the PM files (rule 3a).

**Why it (mostly) fits.** The pack already has the building blocks, just
scattered — this is extension, not invention:
- Confidence scoring HIGH/MEDIUM/LOW already exists in `story-from-figma`
  (SKILL.md:76). Generalize it to the whole dev-file.
- The single-source confidence banner pattern already exists as rule 5
  (`storywright-base` SKILL.md:45–49) for design sources (raster/figma/tokens).
  Add `repo` as another source level — the molding is already there.
- The `⚠️ Assumed` inline marker is already defined (`storywright-base`:27).

**Cost:** Low-medium. Reuses proven mechanisms (confidence scoring + banner).
The new surface is the mode flag, generalizing the scoring beyond Figma, and the
provenance banner.

**Design risks (one is structural and cannot be closed in pure Markdown):**
1. **`[verified]` is the agent's word, not proof.** The pack has no runtime to
   confirm the agent actually read the file it claims. The marker can sit on
   hallucinated content. This is structural — Markdown prose asks, it cannot
   enforce. **Mitigation, not fix:** the banner must state explicitly that
   `verified` is best-effort, not an audit. Selling it as a guarantee would lie.
   Real enforcement needs an execution boundary with runtime (master-context §6)
   — a different product that violates the no-runtime thesis.
2. **PM-file contamination.** Grounded mode adds more technical detail; it must
   stay in `story.dev.md` (rule 3a). The existing no-leakage test
   (`tests/skills-shape.test.mjs`) guards this if the design respects 3a.
3. **Re-introduces non-determinism — but now chosen.** Output still depends on
   what's open, but the user opted in consciously. Poison-when-hidden becomes
   tradeoff-when-explicit. State it in the banner.
4. **Maintenance surface.** A new mode = more paths to test, possibly a second
   golden (grounded vs project-less), more rules that can drift.

**Open design questions for SDD** (why this needs a real planning cycle, not a
mechanical PR): does it need a separate grounded golden? how does provenance
render exactly? does the mode apply to `refine`/`split`/`from-figma` too, or
`generate` only? what's the banner's exact wording so `verified` reads as
best-effort?

**Verdict:** viable and worth it — *only* if the `verified = best-effort, not
guarantee` contract is accepted up front and written into the banner. The risk
is not technical, it's expectation: if users read `verified` as "audited", the
feature disappoints; if they read it as "the agent's best-effort read", it
delivers.

---

## 4. Consolidate to portable Markdown — retire the broken Jira-wiki file ✅ Done

**Problem (resolved).** The original trio's second PM file (the wiki-markup file) emitted Jira wiki
markup (`h2.`, `*bold*`, `{panel}`). Jira Cloud's new issue view moved to ADF /
Markdown and **removed wiki-markup support from the editor — Atlassian states it
won't support it** ([JRACLOUD-69259](https://jira.atlassian.com/browse/JRACLOUD-69259)).
Pasting it into a Cloud ticket failed both ways: the editor didn't
interpret the wiki markup (so `h2.` showed literally) while it *did* autoformat
Markdown (so it half-rendered) — broken formatting, confirmed in real use. The
file the pack shipped specifically for Jira was the one that pasted worst.

**Why it was nearly redundant.** Jira Cloud's editor autoformats standard Markdown
on paste (headings, bold, lists, code, blockquotes, links —
[Atlassian docs](https://support.atlassian.com/jira-software-cloud/docs/markdown-and-keyboard-shortcuts/)).
The existing `story.standard.md` (CommonMark) already pasted into Jira
Cloud *better* than the dedicated wiki file. The two PM files were nearly twins —
a redundancy that signaled the wiki file had outlived its purpose.

**Approach (implemented).** Consolidated to one portable PM Markdown file:
1. Dropped the wiki-markup PM file from the output set (trio → PM `standard` + `dev`).
2. Applied corrections that make `story.standard.md` paste cleanly into the
   Jira Cloud editor: DoD `- [ ]` → plain `- ` bullets in PM projection;
   Markdown pipe tables banned from PM files. One file now portable across
   Jira Cloud / Notion / Linear / GitHub.
3. Renamed the formatter component: `story-formatter`.

**Why it fit.** Pure Markdown, no API — fully inside the thesis. Simplified
the model (fewer files, one less dialect to maintain) rather than adding surface.

**Delivered.** Atomic PR — one branch, one revert. Self-hosted Jira Data
Center/Server wiki-markup support was explicitly retired (shrinking niche).
Design questions resolved in SDD: duo, not optional wiki output.

---

## Shared principle

Every feature here stays inside the thesis — Markdown-pure, no API, PM↔dev duo —
by **extending the composition model rather than fighting it.** Features 1–3
invent no new capability: they harvest signal the pack already generates and
wastes (batch reuses the pipeline, estimate reuses the enrichment, grounded mode
reuses the confidence-banner pattern). Feature 4 goes the other way — it
*removes* surface, retiring a dialect that outlived its purpose. The recurring
design risk across 1–3 is over-automating away the PM's judgment; for 4 it's
touching the core output invariant (now resolved). In every case the real work is knowing
where to STOP.

**Suggested order:** `story-batch` first — highest value, lowest risk, reuses the
whole pipeline, and unblocks the others (estimate over a batch sizes a backlog at
once). Then `consolidate-markdown` (#4) — it fixes a confirmed real-use breakage
and simplifies the model. Then `story-estimate`, then `grounded mode` (most
design risk, pending the `verified = best-effort` thesis call).

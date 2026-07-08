# Storywright — Master Context Document

> **Status:** Canonical long-term context. Read this first for any Storywright work.
> **Audience:** future AI agents, engineers, architects, PMs, founders.
> **Last reconciled:** 2026-05-29 against `main`.

---

## Reading conventions

Every non-trivial claim is tagged:

- **[FACT]** — verified in code; path/line cited.
- **[INFERENCE]** — reasoned deduction from facts.
- **[HYPOTHESIS]** — plausible but unverified; needs validation.

Terminology is normalized in §12 (Glossary).

---

## 1. Executive Summary

**What Storywright is.** [FACT] A *skills pack* for Claude Code that turns ambiguous product inputs — vague prompts, half-baked stories, screenshots — into Jira-ready user stories. It ships as 4 top-level skills (`story-generate`, `story-refine`, `story-split`, `story-batch`) composing 11 shared components under `skills/_components/`. Everything is Markdown with YAML frontmatter. The npm package is a **thin installer**: it copies skill/command files into `~/.claude/`; it contains no runtime and makes no LLM calls.

**Core product vision.** [INFERENCE] Be the PM-facing discovery layer that converts *intent* into a rigorous, INVEST-compliant, Gherkin-structured backlog artifact — without forcing the user through a heavy tool. Methodology-as-skill, not software-as-service.

**System philosophy.** [FACT] "No LLM in code." All AI behavior lives in Markdown prose executed by Claude Code's runtime. The repo owns *knowledge and rules*, not execution, auth, retry, caching, vision, or MCP plumbing — those ride Claude Code deliberately (`docs/architecture.md:62-64`).

**Key architectural characteristics.**
- [FACT] Two layers: **knowledge** (Markdown skills) + **thin installer** (Node ESM scripts).
- [FACT] **Composition is lint-enforced, not runtime-enforced** (`scripts/validate-skills.mjs`): every `composes:` reference must exist and no component may be orphaned.
- [FACT] **Dual output mandatory**: `story.standard.md` (PM-facing, no technical detail) + `story.dev.md` (dev-facing, full technical detail). The PM↔dev split is the central design invariant (`storywright-base` rule 3 / rule 3a).
- [FACT] **Multimodal intake**: text + image (Claude vision).

**Main strategic findings.**
1. [FACT] Storywright is **100% project-less by design**. It does not read, scan, index, or embed any codebase. Its only disk read is `.storywright-context.json` (its own per-run decision memory), confined to the run's output folder (`storywright-base` rule 9).
2. [INFERENCE] The technical detail in `story.dev.md` (endpoints, flags, CLI commands) is **inferred from the requirement**, not grounded in real code. It is plausible invention, not verified fact.
3. [INFERENCE] There is an **ungoverned runtime nuance**: when a skill runs inside Claude Code with a repo open, the *agent* may surface repo-specific facts on its own initiative — either via its own Read/Grep, or from context the harness injects (the project's `CLAUDE.md`, already-open files). The skills do not request this and cannot fully prevent it; it makes the dev file's provenance non-deterministic. See §5.

---

## 2. Product Overview

**Purpose.** [FACT] Transform ambiguous inputs into Jira-ready stories with acceptance criteria, INVEST validation, and a dev-facing technical supplement.

**Main workflows / skills surface.** [FACT]

| Skill | Trigger condition | Slash command |
|---|---|---|
| `story-generate` | Ambiguous prompt / screenshot / fresh story request | `/storywright-story-generate` |
| `story-refine` | Existing but incomplete/weak story → audit & fill in place | `/storywright-story-refine` |
| `story-split` | Oversize story failing INVEST on I/E/S → epic + children | `/storywright-story-split` |
| `story-batch` | Multi-item backlog → one story per item in a single pass | `/storywright-story-batch` |

**Target users.** [INFERENCE] Product managers and PM-adjacent roles who live in Claude Code or claude.ai; secondarily engineers who consume `story.dev.md`. Not a coding-agent audience.

**Core capabilities.** [FACT]
- Cohn (As a / I want / so that) + Gherkin (Given/When/Then) canonical story shape.
- Mechanical pre-split test (deterministic outcome counter, not eyeballed).
- INVEST self-check with verdict → next action mapping.
- Automatic language detection (responds in the user's chat language).
- Multi-source conflict resolution with a source-priority matrix.
- Two-file rendering (PM standard + dev).

**User journeys.** [INFERENCE]
- *Greenfield*: "Permitir login con Google" → clarifications → full story duo. (Canonical dogfood fixture: `tests/fixtures/prompt-google-login.md`.)
- *Refine*: paste a weak story → gap audit → filled in place, ACs preserved.
- *Split*: oversize story → INVEST failure → epic + N children with dependency matrix + per-child V audit (user must approve).

**Current positioning.** [INFERENCE] A methodology-rich, multimodal, Claude-native PM skill pack. Distinct from coding agents (it produces backlog artifacts, not code) and from in-tool ticket AI (it is portable Markdown, not a SaaS feature). See §7.

---

## 3. System Architecture

### 3.1 High-level (two layers)

[FACT]
```
┌─────────────────────────────────────────────────────────────┐
│ KNOWLEDGE LAYER  (skills/, Markdown + YAML)                  │
│   4 top-level skills ── compose ──► 11 _components/          │
│   storywright-base = shared rulebook (every skill inherits)  │
│   Read & executed by Claude Code's runtime (NOT this repo)   │
├─────────────────────────────────────────────────────────────┤
│ INSTALLER LAYER  (bin/ + scripts/, Node ESM, zero deps)      │
│   install / uninstall / validate / zip / list               │
│   Pure filesystem ops. No LLM. No project scanning.          │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Main subsystems

[FACT]
- **bin/storywright.mjs** — CLI dispatcher; spawns a script per subcommand (`bin/storywright.mjs:11-16`).
- **scripts/install-skills.mjs** — copies `skills/` → `~/.claude/skills/storywright/`, copies `commands/*.md` → `~/.claude/commands/storywright-*.md`, appends output folder to `~/.gitignore_global`.
- **scripts/validate-skills.mjs** — frontmatter + composition + orphan linter. Regex-matches `[[name]]` wiki-links in prose; parses no source code.
- **scripts/{uninstall,zip,list}-skills.mjs** — delete installed files / zip one skill for claude.ai upload / list installed vs available.
- **scripts/lib/skills.mjs** — hand-rolled frontmatter + minimal-YAML parser; recursive `SKILL.md` walker.
- **.claude-plugin/plugin.json** — marketplace manifest; declarative list of skills + commands.

### 3.3 Agent orchestration

[INFERENCE] Orchestration is *prose-driven*, not code-driven. A slash-command Markdown file says "Invoke the `<skill>` skill"; Claude Code resolves it, loads the skill + composed components, fuses with user input, and calls the Anthropic API. There is no router, planner, or state machine in this repo — those concepts live as **instructions** inside `storywright-base`'s step-by-step Application skeleton.

### 3.4 Skills/tools architecture

[FACT] All 4 top-level skills compose all 11 components. The 11:
- `storywright-base` — shared rulebook (hard rules, canonical shape, PM↔dev split, mechanical pre-split/deps, language detect).
- `clarification-questions`, `acceptance-criteria`, `invest-checklist`, `definition-of-done`, `business-rules` — story-shaping.
- `edge-cases`, `analytics-events`, `risks-and-dependencies` — **enrichment → `story.dev.md` only** (rule 3a).
- `story-formatter` — renders the 2-file duo.
- `estimation` — Fibonacci story-point estimate from 6 weighted signals; runs as step 8c after INVEST; emits `## Estimate` in `story.dev.md` only.

### 3.5 Context pipeline

[FACT] The only persisted context is `.storywright-context.json`, written when a clarification is resolved via `AskUserQuestion` (rule 9). Schema fields: `language`, `chrome_scope`, `siblings`, `design_source`, `naming_pattern`, `extra`. Read **only** from the exact run output folder — never siblings/parents (rule 9).

### 3.6 Retrieval / indexing systems

[FACT] **None.** No embeddings, no vector store, no index, no AST. The "dependency matrix" (rule 10) is a text match over `Given:` lines of child stories — not a code dependency graph.

### 3.7 Workspace / project concepts

[FACT] Storywright has **no concept of a user project**. No skill input is a repo, file, or workspace. See §5.

### 3.8 Data & execution flow

[FACT, from `storywright-base` Application]
```
input (text|image)
  → 0. detect companion sources + conflicts (BLOCKING AskUserQuestion)
  → 1. read .storywright-context.json (exact folder)
  → 2. language resolution (4a signals)
  → 3. persona sharpening
  → 4. passive-goal check (rule G)
  → 5. gap-check (blocking → ask; non-blocking → ⚠️ Assumed inline)
  → 6. sibling reference check
  → 7. deterministic pre-split test (count ≤1 single / ≥2 split)
  → 8. fill canonical block (PM body; rule 3 — no technical detail)
  → 8b. enrichment → story.dev.md (edge-cases/risks/analytics/DoD; rule 3a)
  → 9. INVEST verdict → render | split | refine | reject
  → 10. render duo via story-formatter + write context json
  → 11. log (≤3 lines; ≤5 if SPLIT)
```

---

## 4. AI & Agent Architecture

**Agent roles.** [INFERENCE] Single agent (Claude Code) playing PM-analyst, executing a fixed skill procedure. No multi-agent fan-out in the product itself.

**Prompt orchestration.** [FACT] Composition by reference: a top-level skill's `composes:` + body `[[links]]` pull component prose into the active prompt. `storywright-base` is the always-inherited spine.

**Context management.** [FACT] Stateless across runs except `.storywright-context.json`. No long-term memory; no cross-folder reads.

**Memory handling.** [FACT] `.storywright-context.json` is the only memory primitive — decision cache, scoped to one run's output folder.

**Routing systems.** [INFERENCE] "Routing" is conditional prose: the pre-split test routes to single-story vs split; `story-generate` recommends `/story-split` at count ≥2; `story-batch` hands multi-item backlogs off to per-item drafting. No code router.

**Tool execution patterns.** [FACT] Skills use `AskUserQuestion` (clarifications, batched ≤4) and `Write` (render files). [INFERENCE] The runtime *additionally* has Read/Grep/Glob available and receives harness-injected context — the source of the ungoverned nuance (§5).

**Retrieval strategies.** [FACT] None beyond reading its own context file.

**Workspace awareness.** [HYPOTHESIS] The agent *can* surface facts about an open repo during a run — by its own Read/Grep or from injected context — but no skill instructs it to. Unobservable from the repo; varies per invocation.

**Project-aware assumptions.** [FACT] Zero in the codebase. Any project awareness today is emergent runtime behavior, not designed capability.

**Session lifecycle.** [INFERENCE] One invocation = one story (or one epic+children, or one duo per backlog item). Context file bridges sequential invocations that share an output folder.

---

## 5. User Story Generation System

**How stories are generated.** [FACT] Skill loads → base Application skeleton (§3.8) → canonical Cohn+Gherkin block for PM files → enrichment components populate `story.dev.md` → INVEST verdict → duo rendered to `docs/storywright/YYYY-MM-DD-HHmm-<slug>/`.

**Dependencies on repositories/projects.** [FACT] **None.** Verified across all 4 skills (`inputs:` = text/image) and all 11 components (`inputs:` = story-context / domain-hints / etc.; never source-files/workspace/repo).

**Current assumptions.** [INFERENCE]
1. User arrives with functional intent, not a codebase to dissect.
2. Technical detail is **output** for engineers, not **input**.
3. A story is a forward contract → it may name endpoints/flags that do not yet exist.

**Project-aware generation.** [FACT] Does not exist as a designed feature.

**Project-less generation.** [FACT] The default and only designed mode. Fully functional; the canonical dogfood path.

**The ungoverned runtime nuance (known issue).** [INFERENCE] Because the agent runs inside Claude Code with the target repo potentially open, the dev file's technical detail can become non-deterministic:
- The agent may name real repo identifiers (libraries, files, types, env vars) that it learned only because the repo is open.
- This can come from the agent's own Read/Grep **or** from context the harness injects automatically (the project's `CLAUDE.md`/`AGENTS.md`, previously-opened files) — the latter is not a tool call the skills can gate.
- Field observation (2026-05-29): even with an explicit "don't use the project" choice, generated dev files surfaced real project identifiers and cited the project's injected `CLAUDE.md`. [HYPOTHESIS] Markdown-level prohibitions reduce but do not eliminate this, because the disallowed knowledge is already in the agent's context window, not behind a tool boundary.

**Implication.** [INFERENCE] `story.dev.md` specifics should be treated as *plausible, unverified* unless independently confirmed. Reliable project-less output is best achieved by running the skill in a session where the target repo is **not** open. A robust governed-source mode would need an enforcement boundary stronger than prose — out of scope for the current design.

**Observed vs inferred vs speculative.**
- *Observed*: inputs, outputs, skeleton, context file. [FACT]
- *Inferred*: dev-file specifics are domain-pattern fills when no repo is present. [INFERENCE]
- *Speculative*: exactly when/why the agent surfaces repo facts unprompted. [HYPOTHESIS]

---

## 6. Project-Aware vs Project-Less

[INFERENCE]
- **Project-less (today, by design):** dev-file specifics come from the model's domain knowledge. Output is a forward contract; specifics are plausible guesses. This is the only designed mode.
- **Project-aware (not a feature):** any grounding against a real repo today is emergent/accidental runtime behavior (§5), not a controlled capability. It is non-deterministic and undeclared.

| Aspect | Project-less (designed) | Project-aware (emergent only) |
|---|---|---|
| Source of dev detail | Model domain knowledge | Whatever the open repo + injected context happens to expose |
| Determinism | High (no repo input) | Low (depends on what's open / injected) |
| Reliability of specifics | Plausible, unverified | Unverified and inconsistent |
| Designed / supported | Yes | No |
| Best practice | Run with repo closed for clean output | Avoid relying on it |

[INFERENCE] **Conclusion:** treat Storywright as a project-less tool. If grounded output is ever wanted as a real feature, it requires an enforcement boundary beyond Markdown prose (e.g. an execution mode that controls what context the agent can see) — a non-trivial design effort, currently not pursued.

---

## 7. UX & Product Positioning

**Onboarding.** [FACT] `npm i -g` → `storywright install` → restart Claude Code → slash commands available. [INFERENCE] Two-step install is a mild papercut; the postinstall hint mitigates it. **A restart is required** for skill changes to take effect — installed-on-disk ≠ loaded-in-session.

**Friction points.** [INFERENCE]
- Two-step install.
- Copy-paste-only output (no Jira/Linear API push).
- Non-deterministic dev-file provenance when a repo is open (§5).

**Cognitive load.** [INFERENCE] End-users feel little load; the rulebook's depth (12 hard rules + sub-rules) is contributor-side cost.

**Edge-case handling.** [FACT] `edge-cases` (8 technical failure axes) → dev file only. Passive-goal (rule G), generic personas (step 3), mockup chrome (rule 7), surface-vs-styling (rule D) all have deterministic handling.

**Positioning (brief).** [INFERENCE] Storywright is **not** a coding agent and does not compete on code generation. Its niche: *rigorous, multimodal intent→backlog* (INVEST + Gherkin + PM↔dev duo), portable across Claude Code / claude.ai. Coding agents (Cursor, Devin, Windsurf, Copilot Workspace) are repo-grounded but produce code, not methodology-enforced stories; in-tool ticket AIs (Linear/Jira/Notion) push tickets directly but are neither multimodal nor methodology-enforcing.

---

## 8. Technical Deep Dive

**Critical files.** [FACT]
- `bin/storywright.mjs:11-16` — command→script map; CLI dispatcher.
- `scripts/install-skills.mjs` — copy skills + commands, update global gitignore.
- `scripts/validate-skills.mjs` — frontmatter/composition/orphan linter (the CI gate).
- `scripts/lib/skills.mjs` — hand-rolled YAML/frontmatter parser + `SKILL.md` walker.
- `scripts/{uninstall,zip,list}-skills.mjs`, `scripts/postinstall-hint.mjs`.
- `skills/_components/storywright-base/SKILL.md` — the rulebook (hard rules, language 4a, rule D, pre-split test, canonical shape, Application skeleton).
- `skills/_components/story-formatter/SKILL.md` — 2-file render + audience table.
- `.claude-plugin/plugin.json` — manifest (15 skills, 4 commands).
- `tests/skills-shape.test.mjs` — parity + no-leakage golden tests; `tests/validate.test.mjs`.
- `examples/outputs/google-login/` — committed golden duo.

**Pipelines / execution chains.** [FACT] CLI → spawn script → filesystem op (install layer). Runtime: slash command → skill+components → Anthropic API (knowledge layer; outside repo).

**Services / adapters / APIs.** [FACT] None in repo. Image intake is via the runtime's native vision, not repo code.

**Embeddings / vector stores / planners / orchestrators / ingestion / dependency graphs / repo scanning / source analysis.** [FACT] **All absent.** The only "graph" is the inter-story dependency matrix (text match over `Given:` lines, rule 10).

**Feature flags.** [FACT] None in the installer. Feature flags appear only as *content* in generated dev files (invented, not real).

**Runtime assumptions.** [FACT] Node 22+ in CI, Node 20+ for scripts; pure ESM; no build step; zero runtime deps. [HYPOTHESIS] Agent may surface open-repo facts unprompted (§5).

---

## 9. Architectural Assumptions & Constraints

### 9.1 Invariants (must not break)
[FACT] "No LLM in code" · thin installer · PM↔dev split (rule 3/3a) · 2-file parity (enforced by `tests/skills-shape.test.mjs`) · validator orphan check · Conventional Commits + semantic-release · **branch + PR always (never commit to `main`)**.

### 9.2 Explicit assumptions
[FACT] Inputs are text/image; output language = user's chat language; one story per invocation (unless split); composition is correct iff the linter passes.

### 9.3 Implicit assumptions
[INFERENCE] User has functional intent ready; technical detail is output; dev-file specifics needn't be real.

### 9.4 Constraints
[FACT/INFERENCE] No runtime → cannot guarantee model behavior beyond prose instruction (the §5 nuance is a direct consequence). Lint-time (not runtime) composition enforcement → a rule violation only fails CI if a test encodes it. Copy-paste-only output (no ticket API). Hand-rolled YAML parser is a fragility surface.

### 9.5 Residual debt
[INFERENCE] Non-deterministic dev-file provenance when a repo is open (§5) · hand-rolled YAML parser · `zip` hard-dependency · no telemetry on whether generated stories survive real refinement.

---

## 10. Strategic Opportunities

[INFERENCE]
1. **Direct ticket push** — Jira/Linear API integration; the recurring real-team ask. (Would require a runtime, challenging the thin-installer invariant — design carefully or keep as a separate companion.)
2. **Telemetry** — measure whether generated stories survive real refinement; a quality signal the product currently lacks.
3. **Richer local context hierarchy** — formalize `.storywright-context.json` into reusable decision memory (naming patterns, persona library, domain glossary) across a backlog.
4. **AI-native expansion** — story → test-stub suggestions, story → analytics-spec, all still as Markdown skills.
5. **Project-aware mode (hard problem)** — only worthwhile with an enforcement boundary stronger than prose (§5/§6). Not pursued today.

---

## 11. Operating Guidance

[INFERENCE] Practical guidance for using/maintaining Storywright today:
- For clean, reproducible project-less output, **run the skill with the target repo closed** (or in a session without it injected). With a repo open, treat `story.dev.md` specifics as plausible-but-unverified (§5).
- Always **restart Claude Code** after reinstalling skills; on-disk install does not hot-reload.
- Keep the PM↔dev split sacred: never let code detail leak into PM files (rule 3) — `tests/skills-shape.test.mjs` guards this.
- All changes land via **branch + PR**, never direct to `main`.

---

## 12. Glossary & Concept Definitions

[Normalized.]

- **Storywright** — the Markdown skills pack + thin npm installer described here.
- **Skill** — a `SKILL.md` file (frontmatter + prose) that Claude Code loads and executes. *Top-level skill* = user-triggered (4). *Component* = composed by skills, not directly triggered (10).
- **Component** — reusable skill fragment under `skills/_components/`, pulled in via `composes:` or `[[links]]`.
- **storywright-base** — the always-inherited component holding the shared rulebook.
- **Composition** — the `composes:`/`[[link]]` mechanism; lint-enforced (no orphans, no missing refs), not runtime-enforced.
- **Project** — a user's codebase/repository. Storywright has **no native concept** of one.
- **Workspace** — the runtime's ambient view of an open repo. Available to the *agent* (and via injected context), not requested by *skills*.
- **Project-aware** — generation grounded against an open repo. Not a designed feature; only emergent/accidental runtime behavior today.
- **Project-less** — generation purely from text/image intent. The current default and only designed mode.
- **Inferred (dev detail)** — `story.dev.md` specifics filled from the model's domain knowledge; plausible, unverified.
- **Injected context** — repo facts the harness places in the agent's context automatically (project `CLAUDE.md`/`AGENTS.md`, open files); not a gated tool call.
- **Context pipeline** — the per-run flow that reads/writes `.storywright-context.json` (decision memory only).
- **`.storywright-context.json`** — per-run, output-folder-scoped decision cache (language, chrome scope, naming pattern, design source, etc.).
- **Retrieval / indexing / embeddings / ingestion / vector store** — **absent** in Storywright; defined here only to state their non-existence.
- **Orchestration** — prose-driven conditional flow (pre-split routing, split hand-off); no code router.
- **Agent** — Claude Code's runtime executing the skill prose; the only "agent" involved.
- **Memory** — only `.storywright-context.json`; no long-term store.
- **Dependency matrix** — inter-*story* dependency map from text-matching `Given:` lines (rule 10); **not** a code dependency graph.
- **Pre-split test** — deterministic outcome counter deciding single-story vs split.
- **PM↔dev split** — rule 3 / 3a: PM files carry no technical detail; `story.dev.md` carries all of it.
- **Dual output / 2-file parity** — every story emits `story.standard.md` + `story.dev.md` (CI-enforced).
- **Banner** — single source-confidence line at the top of a block (rule 5).
- **Thin installer** — the npm package: copies files, no runtime, no LLM, no project scanning.

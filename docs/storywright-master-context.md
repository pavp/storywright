# Storywright — Master Context Document

> **Status:** Canonical long-term context. Supersedes and consolidates `storywright-analysis-report.md` (drift/quality audit) and `storywright-user-story-generation-analysis.md` (project-dependency analysis).
> **Audience:** future AI agents, engineers, architects, PMs, founders. Read this first.
> **Last reconciled:** 2026-05-29 against `main` (commits through `0f0518d`).

---

## Reading conventions

Every non-trivial claim is tagged:

- **[FACT]** — verified in code; path/line cited.
- **[INFERENCE]** — reasoned deduction from facts.
- **[HYPOTHESIS]** — plausible but unverified; needs validation.
- **[RESOLVED]** — a finding from a prior report that newer commits have already fixed; kept for historical traceability, not as an open issue.

Terminology is normalized in §12 (Glossary). Where the two source reports used different names for the same concept, the glossary term wins.

---

## 1. Executive Summary

**What Storywright is.** [FACT] A *skills pack* for Claude Code that turns ambiguous product inputs — vague prompts, half-baked stories, screenshots, Figma links — into Jira-ready user stories. It ships as 4 top-level skills (`story-generate`, `story-refine`, `story-split`, `story-from-figma`) composing 10 shared components under `skills/_components/`. Everything is Markdown with YAML frontmatter. The npm package is a **thin installer**: it copies skill/command files into `~/.claude/`; it contains no runtime and makes no LLM calls.

**Core product vision.** [INFERENCE] Be the PM-facing discovery layer that converts *intent* into a rigorous, INVEST-compliant, Gherkin-structured backlog artifact — without forcing the user through a heavy tool. It is methodology-as-skill, not software-as-service.

**System philosophy.** [FACT] "No LLM in code." All AI behavior lives in Markdown prose executed by Claude Code's runtime. The repo owns *knowledge and rules*, not execution, auth, retry, caching, vision, or MCP plumbing — those ride Claude Code deliberately (`docs/architecture.md:62-64`).

**Key architectural characteristics.**
- [FACT] Two layers: **knowledge** (Markdown skills) + **thin installer** (Node ESM scripts).
- [FACT] **Composition is lint-enforced, not runtime-enforced** (`scripts/validate-skills.mjs`): every `composes:` reference must exist and no component may be orphaned.
- [FACT] **Triple output mandatory**: `story.standard.md` + `story.jira-wiki.md` (PM-facing, no technical detail) + `story.dev.md` (dev-facing, full technical detail). The PM↔dev split is the central design invariant (`storywright-base` rule 3 / rule 3a).
- [FACT] **Multimodal intake**: text + image + Figma (via MCP), with PNG fallback.

**Main strategic findings.**
1. [FACT] Storywright is **100% project-less by design**. It does not read, scan, index, or embed any codebase. Its only disk read is `.storywright-context.json` (its own per-run decision memory), confined to the run's output folder (`storywright-base:65`).
2. [INFERENCE] The technical detail in `story.dev.md` (endpoints, flags, CLI commands) is **inferred from the requirement**, not grounded in real code. It is plausible invention, not verified fact.
3. [INFERENCE] The real architectural gap is an **ungoverned runtime nuance**: when a skill runs inside Claude Code with a repo open, the *agent* may read the workspace on its own initiative — but the skill neither requests nor forbids it, so behavior is non-deterministic and undeclared.
4. [RESOLVED] An earlier audit found split-brain orphan components, a stale `plugin.json` (v0.1.0, 13 skills, missing `storywright-base`), and `story-from-figma` emitting 2 files. Commits `808f79a`/`fc3e399` fixed all three; current state: 14 skills listed incl. base, v1.12.0, 3-file parity enforced. See §9.
5. [INFERENCE] Highest-leverage next move: **govern the source of truth** via ask-first explicit grounding. Cheap (Markdown only), reproducible, invariant-preserving.

---

## 2. Product Overview

**Purpose.** [FACT] Transform ambiguous inputs into Jira-ready stories with acceptance criteria, INVEST validation, and a dev-facing technical supplement.

**Main workflows / skills surface.** [FACT]

| Skill | Trigger condition | Slash command |
|---|---|---|
| `story-generate` | Ambiguous prompt / screenshot / fresh story request | `/storywright-story-generate` |
| `story-refine` | Existing but incomplete/weak story → audit & fill in place | `/storywright-story-refine` |
| `story-split` | Oversize story failing INVEST on I/E/S → epic + children | `/storywright-story-split` |
| `story-from-figma` | Figma URL → one story per user-goal flow | `/storywright-story-from-figma` |

**Target users.** [INFERENCE] Product managers and PM-adjacent roles who live in Claude Code or claude.ai; secondarily engineers who consume `story.dev.md`. Not a coding-agent audience.

**Core capabilities.** [FACT]
- Cohn (As a / I want / so that) + Gherkin (Given/When/Then) canonical story shape.
- Mechanical pre-split test (deterministic outcome counter, not eyeballed).
- INVEST self-check with verdict → next action mapping.
- Automatic language detection (responds in the user's chat language).
- Multi-source conflict resolution with a source-priority matrix.
- Three-file rendering (PM standard + Jira wiki + dev).

**User journeys.** [INFERENCE]
- *Greenfield*: "Permitir login con Google" → clarifications → full story trio. (Canonical dogfood fixture: `tests/fixtures/prompt-google-login.md`.)
- *Refine*: paste a weak story → gap audit → filled in place, ACs preserved.
- *Split*: oversize story → INVEST failure → epic + N children with dependency matrix + per-child V audit (user must approve).
- *Figma*: paste Figma URL → one story per logical flow → trio per flow.

**Current positioning.** [INFERENCE] A methodology-rich, multimodal, Claude-native PM skill pack. Distinct from coding agents (it produces backlog artifacts, not code) and from in-tool ticket AI (it is portable Markdown, not a SaaS feature). See §7 comparison.

---

## 3. System Architecture

### 3.1 High-level (two layers)

[FACT]
```
┌─────────────────────────────────────────────────────────────┐
│ KNOWLEDGE LAYER  (skills/, Markdown + YAML)                  │
│   4 top-level skills ── compose ──► 10 _components/          │
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

[FACT] All 4 top-level skills compose all 10 components. The 10:
- `storywright-base` — shared rulebook (hard rules, canonical shape, PM↔dev split, mechanical pre-split/deps, language detect).
- `clarification-questions`, `acceptance-criteria`, `invest-checklist`, `definition-of-done`, `business-rules` — story-shaping.
- `edge-cases`, `analytics-events`, `risks-and-dependencies` — **enrichment → `story.dev.md` only** (rule 3a).
- `jira-wiki-formatter` — renders the 3-file trio.

### 3.5 Context pipeline

[FACT] The only persisted context is `.storywright-context.json`, written when a clarification is resolved via `AskUserQuestion` (rule 9). Schema fields: `language`, `chrome_scope`, `siblings`, `design_source`, `naming_pattern`, `extra`. Read **only** from the exact run output folder — never siblings/parents (`storywright-base:65,81`).

### 3.6 Retrieval / indexing systems

[FACT] **None.** No embeddings, no vector store, no index, no AST. The "dependency matrix" (rule 10) is a text match over `Given:` lines of child stories — not a code dependency graph.

### 3.7 Workspace / project concepts

[FACT] Storywright has **no concept of a user project**. The word "workspace" appears only as the *runtime's* ambient capability, never as a storywright input. See §5–§6.

### 3.8 Data & execution flow

[FACT, from `storywright-base:201-249`]
```
input (text|image|figma)
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
  → 10. render trio via jira-wiki-formatter + write context json
  → 11. log (≤3 lines; ≤5 if SPLIT)
```

---

## 4. AI & Agent Architecture

**Agent roles.** [INFERENCE] Single agent (Claude Code) playing PM-analyst, executing a fixed skill procedure. No multi-agent fan-out in the product itself.

**Prompt orchestration.** [FACT] Composition by reference: a top-level skill's `composes:` + body `[[links]]` pull component prose into the active prompt. `storywright-base` is the always-inherited spine.

**Context management.** [FACT] Stateless across runs except `.storywright-context.json`. No long-term memory; no cross-folder reads.

**Memory handling.** [FACT] `.storywright-context.json` is the only memory primitive — decision cache, scoped to one run's output folder.

**Routing systems.** [INFERENCE] "Routing" is conditional prose: the pre-split test routes to single-story vs split; `story-generate` recommends `/story-split` at count ≥2; `story-from-figma` hands multi-flow off to split. No code router.

**Tool execution patterns.** [FACT] Skills use `AskUserQuestion` (clarifications, batched ≤4) and `Write` (render files). [INFERENCE] The runtime *additionally* has Read/Grep/Glob available — the source of the ungoverned nuance (§5).

**Retrieval strategies.** [FACT] None beyond reading its own context file.

**Workspace awareness.** [HYPOTHESIS] The agent *can* inspect an open repo on its own initiative during a run, but no skill instructs it to. This is unobservable from the repo and varies per invocation.

**Project-aware assumptions.** [FACT] Zero in the codebase. Any project awareness today is emergent runtime behavior, not designed capability.

**Session lifecycle.** [INFERENCE] One invocation = one story (or one epic+children, or one trio per Figma flow). Context file bridges sequential invocations that share an output folder.

---

## 5. User Story Generation System

**How stories are generated.** [FACT] Skill loads → base Application skeleton (§3.8) → canonical Cohn+Gherkin block for PM files → enrichment components populate `story.dev.md` → INVEST verdict → trio rendered to `docs/storywright/YYYY-MM-DD-HHmm-<slug>/`.

**Dependencies on repositories/projects.** [FACT] **None.** Verified across all 4 skills (`inputs:` = text/image/figma-link) and all 10 components (`inputs:` = story-context / domain-hints / etc.; never source-files/workspace/repo).

**Current assumptions.** [INFERENCE]
1. User arrives with functional intent, not a codebase to dissect.
2. Technical detail is **output** for engineers, not **input**.
3. A story is a forward contract → it may name endpoints/flags that do not yet exist.

**Project-aware generation.** [FACT] Does not exist as a designed feature. [HYPOTHESIS] Occurs only as accidental runtime behavior.

**Project-less generation feasibility.** [FACT] Already the default and only designed mode. Fully functional; the canonical dogfood path.

**Workflow limitations.** [INFERENCE] `story.dev.md` can assert plausible-but-false specifics (e.g. `POST /auth/google/callback`, flag `auth_google_login`, `npm run test:e2e -- auth-google` in `examples/outputs/google-login/story.dev.md:7-8,44`) that no project confirms. A dev may mistake invention for fact.

**Orchestration dependencies.** [FACT] Only the base skeleton + composed components. No external services.

**Prompts involved.** [FACT] `storywright-base` rulebook + the relevant top-level delta + composed component prose, all fused into one Claude prompt by the runtime.

**Architectural coupling.** [FACT] Coupled only to: Claude Code runtime, `AskUserQuestion`, `Write`, and `.storywright-context.json`. No coupling to any project artifact.

**Observed vs inferred vs speculative.**
- *Observed*: inputs, outputs, skeleton, context file, banners. [FACT]
- *Inferred*: dev-file specifics are domain-pattern fills. [INFERENCE]
- *Speculative*: the agent reading the open repo unprompted. [HYPOTHESIS]

---

## 6. Project-Aware vs Project-Less Analysis

### 6.1 Conceptual difference

[INFERENCE]
- **Project-less (today):** dev-file specifics come from the model's domain knowledge. Output is a forward contract; specifics are plausible guesses.
- **Project-aware (proposed):** before writing the dev file, the skill instructs the agent to confirm endpoints/flags/paths against the open workspace via native Read/Grep/Glob; unconfirmed items are marked `⚠️ Assumed`.

### 6.2 Current implementation state

[FACT] Project-less is the only designed mode. Project-aware exists only as the ungoverned runtime nuance — non-deterministic, undeclared.

### 6.3 Feasibility & recommended evolution

[INFERENCE] Project-aware is feasible **without new infrastructure**: a new Markdown step in the base skeleton + a `source_grounding` field in the context file + a source banner in the dev file. Native tools (Read/Grep/Glob) do the reading. No embeddings/index/server — that would break the thin-installer and "No LLM in code" invariants.

### 6.4 Mode-decision strategy — tradeoffs

| Criterion | Ask-first (recommended) | Detection-first | Hybrid |
|---|---|---|---|
| Reproducibility | High (explicit, persisted) | Medium (heuristic) | High |
| UX friction | 1 question (skill already asks others) | Zero | 1 conditional question |
| User control | Total | Low (magic) | High |
| Latency / cost | Negligible | Negligible | Negligible |
| Dev-file precision | Governed | Variable | Governed |
| Maintenance | Low | Medium | High |
| Determinism | Yes | Not guaranteed | Yes |
| Wrong-repo risk | None (user confirms) | Real | Low |

[INFERENCE] **Ask-first** wins: it reuses the existing `AskUserQuestion` + rule-9 persistence + rule-5 banner pattern, converting the agent's coin-flip into a declared, persisted, transparent decision.

### 6.5 Architectural / UX / orchestration / scaling implications

[INFERENCE]
- *Architectural:* the two modes are one parameter (`source_grounding`) of one pipeline, not two products. Project-less is the natural fallback of project-aware when the workspace has no matches.
- *UX:* a single banner declares provenance per dev file; PM files never change (rule 3 intact).
- *Orchestration:* one new skeleton step; no router.
- *Scaling:* native tools suffice for normal repos; monorepo-scale grounding would (only then) justify revisiting an index — explicitly out of MVP scope.

---

## 7. UX & Product Strategy Analysis

**Onboarding.** [FACT] `npm i -g` → `storywright install` → restart Claude Code → slash commands available. [INFERENCE] Two-step install (npm then `install`) is a mild papercut; postinstall hint mitigates it.

**Friction points.** [INFERENCE]
- Two-step install.
- Copy-paste-only output (no Jira/Linear API push) — the obvious next ask from real teams (`storywright-analysis-report` §4.4).
- Undeclared dev-file provenance (the §5 gap) — silent cognitive risk for engineers.

**Discovery flows.** [INFERENCE] Slash-command names are discoverable; the methodology depth (INVEST gates, mechanical split, PM↔dev split) is *not* surfaced at point-of-use — it works invisibly, which is good for PMs but opaque for contributors.

**Cognitive load / learning curve.** [INFERENCE — from `storywright-analysis-report` §4.3] The *hidden cost* is contributor-side: the rulebook is dense (12 hard rules + sub-rules). End-users feel little load; contributors feel a lot.

**Hidden assumptions.** [INFERENCE] User has functional intent ready; English/Spanish are first-class; technical detail is output not input; one story per invocation.

**Edge cases.** [FACT] Encoded in `edge-cases` (8 technical failure axes) → dev file only. Passive-goal stories (rule G), generic personas (step 3), mockup chrome (rule 7), surface-vs-styling (rule D) all have deterministic handling.

**Ideal & hybrid workflows.** [INFERENCE] Ideal: PM in Claude Code with the target repo open, ask-first chooses *workspace-confirmed*, dev file is grounded with `⚠️ Assumed` gaps flagged. Hybrid: greenfield discovery (inferred) early, grounded refinement once code exists.

### 7.1 Positioning (brief)

[INFERENCE] Storywright is **not** a coding agent and does not compete on code generation. Its defensible niche: *rigorous, multimodal intent→backlog* (INVEST + Gherkin + PM↔dev trio), portable across Claude Code / claude.ai. Coding agents (Cursor, Devin, Windsurf, Copilot Workspace) are repo-grounded but produce code, not methodology-enforced stories; in-tool ticket AIs (Linear/Jira/Notion) push tickets directly but are neither multimodal nor methodology-enforcing. Governed project-awareness (§6) closes the one gap where coding agents lead — without becoming one. *(Full competitive matrix intentionally omitted — this is a context document, not a market analysis.)*

---

## 8. Technical Deep Dive

**Critical files.** [FACT]
- `bin/storywright.mjs:11-16` — command→script map; CLI dispatcher.
- `scripts/install-skills.mjs` — copy skills + commands, update global gitignore.
- `scripts/validate-skills.mjs` — frontmatter/composition/orphan linter (the CI gate).
- `scripts/lib/skills.mjs` — hand-rolled YAML/frontmatter parser + `SKILL.md` walker.
- `scripts/{uninstall,zip,list}-skills.mjs`, `scripts/postinstall-hint.mjs`.
- `skills/_components/storywright-base/SKILL.md` — the rulebook (hard rules 25-97; 4a 99-117; rule D 119-129; pre-split 145-162; canonical shape 164-199; Application 201-249).
- `skills/_components/jira-wiki-formatter/SKILL.md` — 3-file render + audience table (29-39).
- `.claude-plugin/plugin.json` — manifest (v1.12.0, 14 skills, 4 commands).
- `tests/skills-shape.test.mjs` — parity + no-leakage golden tests; `tests/validate.test.mjs`.
- `examples/outputs/google-login/` — committed golden trio.

**Pipelines / execution chains.** [FACT] CLI → spawn script → filesystem op (install layer). Runtime: slash command → skill+components → Anthropic API (knowledge layer; outside repo).

**Services / adapters / APIs.** [FACT] None in repo. Figma access is via the runtime's MCP server, not repo code.

**Embeddings / vector stores / planners / orchestrators / ingestion / dependency graphs / repo scanning / source analysis.** [FACT] **All absent.** The only "graph" is the inter-story dependency matrix (text match over `Given:` lines, rule 10).

**Feature flags.** [FACT] None in the installer. Feature flags appear only as *content* in generated dev files (e.g. `auth_google_login`) — invented, not real.

**Runtime assumptions.** [FACT] Node 22+ in CI, Node 20+ for scripts; pure ESM; no build step; zero runtime deps. [HYPOTHESIS] Agent may use Read/Grep/Glob on an open repo unprompted (§5).

---

## 9. Architectural Assumptions & Constraints

### 9.1 Invariants (must not break)
[FACT] "No LLM in code" · thin installer · PM↔dev split (rule 3/3a) · 3-file parity (enforced by `tests/skills-shape.test.mjs`) · validator orphan check · Conventional Commits + semantic-release.

### 9.2 Explicit assumptions
[FACT] Inputs are text/image/figma; output language = user's chat language; one story per invocation (unless split); composition is correct iff the linter passes.

### 9.3 Implicit assumptions
[INFERENCE] User has functional intent ready; technical detail is output; dev-file specifics needn't be real; the agent's repo access is irrelevant (the gap §5 challenges this last one).

### 9.4 Constraints
[FACT/INFERENCE] No runtime → cannot guarantee model behavior beyond prose instruction. Lint-time (not runtime) composition enforcement → a rule violation only fails CI if a test encodes it. Copy-paste-only output (no ticket API). Hand-rolled YAML parser is fragility surface (`storywright-analysis-report` §3.3, severity E).

### 9.5 Resolved architectural debt (historical) — [RESOLVED]
The earlier audit's three top findings are **closed**:
| Prior finding | Prior state | Current state (verified) | Fixed by |
|---|---|---|---|
| **A** orphan components / split-brain; `architecture.md` claimed 9-component composition | 5 of 10 components orphaned, teaching rule-3-forbidden content | All 10 composed by all 4 skills; enrichment scoped to dev file via rule 3a | `808f79a` |
| **B** `plugin.json` v0.1.0, 13 skills, missing `storywright-base` | manifest drift | v1.12.0, 14 skills incl. base | `fc3e399`, `0f0518d` |
| **C** `story-from-figma` 2-file output vs "dual output" docs | output-shape drift | 3-file trio per flow; parity test P1.2 | `808f79a` |

### 9.6 Open residual debt
[INFERENCE] Ungoverned dev-file provenance (§5) · hand-rolled YAML parser · `zip` hard-dependency · no telemetry on whether generated stories survive real refinement.

---

## 10. Strategic Opportunities

[INFERENCE]
1. **Govern the source of truth** (§6) — turn the runtime accident into a declared, persisted decision. Highest leverage, lowest cost.
2. **Direct ticket push** — Jira/Linear API integration; the recurring real-team ask. (Note: would require a runtime, challenging the thin-installer invariant — design carefully or keep as separate companion.)
3. **Grounding-rate telemetry** — % of dev-file specs confirmed vs assumed; a quality signal that also measures the §6 feature's value.
4. **Context hierarchy** — formalize `.storywright-context.json` into a richer, still-local decision memory (naming patterns, persona library, domain glossary) reused across a backlog.
5. **AI-native expansion** — story → test-stub suggestions, story → analytics-spec, all still as Markdown skills.

---

## 11. Recommended Future Architecture

### 11.1 MVP (days; Markdown only) — "govern the source"
[INFERENCE] Reuse existing primitives:
- New skeleton step **7b "grounding resolution"** in `storywright-base` (between pre-split and fill): read `source_grounding` from context; if absent, `AskUserQuestion` (default `inferred` vs `workspace-confirmed`); persist (rule 9). If `workspace-confirmed`: instruct Read/Grep/Glob to confirm endpoints/flags/paths; unconfirmed → `⚠️ Assumed`; empty workspace → fallback to `inferred` with notice, no re-ask.
- `source_grounding: "inferred" | "workspace-confirmed"` field in `.storywright-context.json`.
- Source banner in `story.dev.md` via `jira-wiki-formatter` (reusing rule-5 banner pattern).
- Update golden outputs + add test P2.2 (dev file declares banner; banner must not leak to PM files).
- Sync `commands/*.md` bodies (CLAUDE.md requires command-body parity).
- **Success metric:** 100% of dev files declare provenance; zero indeterminate-source runs.

### 11.2 Medium term
[INFERENCE] Detection-first as an *opt-in* convenience (pre-select the ask-first option when a repo is detected, without skipping confirmation). Grounding-rate telemetry in the generation log. Optional Jira/Linear push as a companion (kept out of the thin installer).

### 11.3 Long-term vision
[INFERENCE] A single context-driven pipeline where `source_grounding` is a first-class parameter; `inferred` is the formal fallback of `workspace-confirmed`; provenance is always declared per section. Optional richer local context hierarchy for backlog-scale reuse. Infrastructure (index/embeddings) only ever revisited at monorepo scale, and only if it can be done without violating the thin-installer invariant.

### 11.4 Migration / rollout
[INFERENCE] Fully additive and backward-compatible: default `inferred` reproduces today's behavior. No breaking change. Roll out behind the natural gate of the new question's default.

### 11.5 Anti-patterns to avoid
[INFERENCE] ❌ Adding embeddings/vector store/server to the package (breaks invariants; unnecessary — native tools suffice). ❌ Silent detection-first that reads the repo without declaring it (reintroduces the very indeterminism we remove). ❌ Leaking code detail into PM files (violates rule 3). ❌ Re-asking grounding already persisted.

---

## 12. Glossary & Concept Definitions

[Normalized — these definitions win over either source report.]

- **Storywright** — the Markdown skills pack + thin npm installer described here.
- **Skill** — a `SKILL.md` file (frontmatter + prose) that Claude Code loads and executes. *Top-level skill* = user-triggered (4). *Component* = composed by skills, not directly triggered (10).
- **Component** — reusable skill fragment under `skills/_components/`, pulled in via `composes:` or `[[links]]`.
- **storywright-base** — the always-inherited component holding the shared rulebook.
- **Composition** — the `composes:`/`[[link]]` mechanism; lint-enforced (no orphans, no missing refs), not runtime-enforced.
- **Project** — a user's codebase/repository. Storywright has **no native concept** of one.
- **Workspace** — the runtime's ambient view of an open repo. Available to the *agent*, not requested by *skills*.
- **Project-aware** — generation that grounds dev-file specifics against the open workspace. Proposed, governed; not a designed feature today.
- **Project-less** — generation purely from text/image/figma intent. The current default and only designed mode.
- **Inferred (grounding)** — dev-file specifics filled from the model's domain knowledge; plausible, unverified.
- **Workspace-confirmed (grounding)** — dev-file specifics verified against real code; gaps marked `⚠️ Assumed`. (Proposed.)
- **source_grounding** — proposed context-file field: `inferred | workspace-confirmed`.
- **Context pipeline** — the per-run flow that reads/writes `.storywright-context.json` (decision memory only).
- **`.storywright-context.json`** — per-run, output-folder-scoped decision cache (language, chrome scope, naming pattern, design source, etc.).
- **Retrieval / indexing / embeddings / ingestion / vector store** — **absent** in Storywright; defined here only to state their non-existence.
- **Orchestration** — prose-driven conditional flow (pre-split routing, split hand-off); no code router.
- **Agent** — Claude Code's runtime executing the skill prose; the only "agent" involved.
- **Memory** — only `.storywright-context.json`; no long-term store.
- **Dependency matrix** — inter-*story* dependency map from text-matching `Given:` lines (rule 10); **not** a code dependency graph.
- **Pre-split test** — deterministic outcome counter (rule; `storywright-base:145-162`) deciding single-story vs split.
- **PM↔dev split** — rule 3 / 3a: PM files carry no technical detail; `story.dev.md` carries all of it.
- **Triple output / 3-file parity** — every story emits `story.standard.md` + `story.jira-wiki.md` + `story.dev.md` (CI-enforced).
- **Banner** — single source-confidence line at the top of a block (rule 5; extended to dev-file provenance in §11).
- **Thin installer** — the npm package: copies files, no runtime, no LLM, no project scanning.

---

## Appendix — Source reconciliation

- `storywright-analysis-report.md` — drift/quality audit. Its open findings A/B/C are **[RESOLVED]** (§9.5); its product/DX/competitive/roadmap insights are elevated into §7/§9/§10.
- `storywright-user-story-generation-analysis.md` — project-dependency analysis. Its core conclusion (project-less by design; govern the runtime nuance; ask-first) is the spine of §5/§6/§11.
- Contradiction resolved: the audit's "missing golden outputs" and "no committed examples" predate `examples/outputs/google-login/` and the parity tests, which now exist on `main`.

# Storywright — Deep Analysis Report

> **Fecha / Date:** 2026-05-29
> **Autor / Author:** PM senior (plataformas de desarrollo, DX, AI coding agents) — análisis crítico, comparativo y accionable.
> **Repo:** `@pavp/storywright` v1.11.1 · skills pack para Claude Code.
> **Idioma / Language:** Executive Summary en español; detalle técnico en inglés (per request).
> **Alcance / Scope:** Análisis + plan de fixes. **No se ejecutó ningún cambio** al código, skills ni configs. `git status` permanece limpio salvo este archivo.

---

## 1. Executive Summary *(ES)*

**Qué es.** Storywright es un *skills pack* para Claude Code: 4 skills top-level (`story-generate`, `story-refine`, `story-split`, `story-from-figma`) + 10 componentes en `skills/_components/`, todo en Markdown con frontmatter YAML, más un instalador npm fino. Cero runtime propio, cero llamadas a LLM en código — toda la "inteligencia" vive en los prompts. La propuesta de valor es nítida: *convertir inputs ambiguos (prompts, screenshots, links de Figma) en historias de usuario listas para Jira* con AC, INVEST, DoD y separación PM/dev.

**Veredicto.** El **diseño** es sólido y bien pensado: composición de skills, un `storywright-base` como única fuente de verdad de reglas, pipeline de release con OIDC y gates de atomicidad, clean-room MIT documentado. El **mantenimiento**, en cambio, generó *drift* acumulado: con releases casi diarios (v1.0.0 → v1.11.1 en pocos días) la documentación, el manifest de marketplace y un tercio de los componentes quedaron desincronizados de la realidad del código. No es un proyecto mal arquitecturado; es un proyecto bien arquitecturado que la velocidad de iteración dejó atrás en consistencia. El validador de CI pasa, pero **valida la forma, no la verdad** — por eso el drift sobrevivió.

**Top-3 hallazgos críticos.**

1. **Componentes huérfanos que contradicen el rulebook (split-brain).** 5 de los 10 componentes (`business-rules`, `edge-cases`, `analytics-events`, `risks-and-dependencies`, `definition-of-done`) **nunca** se componen en ningún skill, y peor: producen exactamente lo que `storywright-base` rule 3 **prohíbe** ("No mini-PRDs"). Además `docs/architecture.md` documenta una composición de 9 componentes que el código real (5) contradice. Es deuda conceptual que confunde a contribuyentes y arriesga violaciones de reglas en runtime.

2. **Manifest de marketplace roto.** `.claude-plugin/plugin.json` está en `v0.1.0` (vs `package.json` `v1.11.1`) y **omite `storywright-base`** de su lista de skills. Como todos los top-level dependen de esa base, una instalación vía marketplace entregaría skills *sin su rulebook* → degradación silenciosa.

3. **`story-from-figma` desincronizado del contrato de 3 archivos (al momento del análisis).** Base + generate + refine habían migrado a salida de 3 archivos (incl. `story.dev.md`); figma seguía en 2 y no mencionaba `dev.md`. `CLAUDE.md` todavía decía "dual output mandatory" (2 archivos). La salida dependía del punto de entrada. (Resuelto posteriormente con la consolidación a duo: standard + dev.)

**Tabla de severidad.**

| ID | Hallazgo | Severidad | Esfuerzo de fix |
|----|----------|-----------|-----------------|
| A | Componentes huérfanos + contradicción doc/código/rulebook | 🔴 Crítico | Medio |
| B | Drift de versión + `storywright-base` ausente del manifest | 🟠 Alto | Bajo (quick win) |
| C | `story-from-figma` en 2 archivos vs contrato de 3 | 🟠 Alto | Bajo |
| D | Tests solo "humo" + sin golden outputs ni ejemplos | 🟡 Medio | Medio-Alto |
| E | Fragilidad de tooling (parser YAML, zip, install, README) | 🟡 Medio/Bajo | Bajo |
| F | Validador no detecta huérfanos ni contradicciones | 🟡 Medio | Bajo |

**Recomendación de una línea:** antes de seguir agregando features, **congelar el drift** — sincronizar manifest, decidir el destino de los 5 componentes huérfanos, y enseñar al validador a detectar huérfanos. Son días de trabajo, no semanas, y eliminan la mayor fuente de confusión del proyecto.

---

## 2. Current Architecture *(EN)*

### 2.1 Two layers

```
┌──────────────────────────────────────────────┐
│  skills/                          (knowledge) │
│    story-generate / story-refine /            │
│    story-split / story-from-figma             │
│    _components/  (10 components)              │
├──────────────────────────────────────────────┤
│  bin/ + scripts/                  (installer) │
│    storywright install|validate|zip|list|...  │
└──────────────────────────────────────────────┘
                 │ copy
                 ▼
       ~/.claude/skills/storywright/
                 │ read at runtime
                 ▼
          Claude Code  →  Anthropic API
```

- **`skills/`** — the deliverable. Pure Markdown + YAML frontmatter (`name`, `description`, `trigger`, `intent`, `version`, `inputs`, `outputs`, `composes`).
- **`bin/storywright.mjs` + `scripts/`** — filesystem-only. The CLI is a dispatcher spawning npm scripts (`install`, `uninstall`, `list`, `zip`, `validate`). Zero LLM calls.
- **Runtime** — Claude Code, not in this repo. This is an explicit, defensible decision (`docs/architecture.md:62-64`): owning auth/retry/caching/vision/MCP would be a large maintenance burden Claude Code already solves.

### 2.2 The composition model — and where it breaks

Top-level skills declare their components in `composes:` frontmatter; `scripts/validate-skills.mjs` confirms every referenced component **exists**. Composition is enforced at lint time, not runtime — Claude reads the body and follows `[[ref]]` links.

`skills/_components/storywright-base/SKILL.md` (287 lines, 12 hard rules) is the single source of truth: it states that all 4 top-level skills behave identically except for **source**, **prompt**, and **split-behavior**. This is the strongest architectural idea in the repo — DRY across four near-identical skills.

**The break:** the actual `composes:` graph references only **5** of the 10 components:

```
story-generate / story-refine / story-split / story-from-figma  →  compose:
  ├─ storywright-base
  ├─ clarification-questions
  ├─ acceptance-criteria
  ├─ invest-checklist
  └─ story-formatter   ← renamed from the original wiki-markup formatter component
```

The other 5 (`business-rules`, `edge-cases`, `analytics-events`, `risks-and-dependencies`, `definition-of-done`) are **never referenced in any `composes:`** (verified: `grep _components/ skills/*/SKILL.md` → the wired 5 appear 4× each, the orphans 0×). See §5 / Finding A for why this is worse than dead code.

### 2.3 Multi-provider stance

Each skill ends with an optional `<claude-specific>` XML block (extended-thinking hints, caching). Other LLMs ignore unknown XML. No adapter code is shipped — a deliberate "downstream concern" (`docs/architecture.md:46-48`). *In practice* the skills lean heavily on Claude features (extended thinking, `AskUserQuestion`, MCP Figma), so "multi-provider" is aspirational, not real today.

### 2.4 Release flow (a genuine strength)

Trunk-based: PR → merge `main` → `release.yml` runs semantic-release → `publish` job uses npm Trusted Publishing (OIDC, no token) with provenance. Atomicity gates: pre-flight `validate` + `test`; post-publish polls the npm registry to confirm the version is live before exiting (`release.yml`). `RELEASING.md` documents rollback. This is more rigor than most repos this size.

---

## 3. Technical Evaluation *(EN)*

### 3.1 CLI & scripts

| File | Role | Notes |
|------|------|-------|
| `bin/storywright.mjs` | dispatcher | `spawn(... stdio:"inherit")`, clean exit-code propagation. Solid. |
| `scripts/install-skills.mjs` | copy skills+commands, add `docs/storywright/` to global gitignore | Naive `~` expansion (`startsWith("~")` only); no post-copy verification. |
| `scripts/validate-skills.mjs` | frontmatter + composition linter | See Finding F — checks refs exist, not that components are used. |
| `scripts/uninstall-skills.mjs` | scoped removal (`storywright-` prefix) | Good — prevents collateral deletion. |
| `scripts/zip-skill.mjs` | package one skill for claude.ai | Hard dependency on `zip` binary; redundant double path-exists check. |
| `scripts/list-skills.mjs` | list available/installed | Graceful `(unnamed)` fallback. |
| `scripts/lib/skills.mjs` | shared parsing | Hand-rolled YAML parser, no nesting support — fragile for richer frontmatter. |

### 3.2 Validation & CI

- `ci.yml`: Node 22, `npm ci` → `npm run validate` → `npm test`. Linear, cached, reproducible.
- `validate-skills.mjs` enforces: required frontmatter keys, kebab-case names ≤64 chars, description ≤200 chars, `## Purpose` + `## Application` sections, and that each `composes` entry resolves to a real component directory.
- **Verified locally:** `node scripts/validate-skills.mjs` → exit 0, "✓ 14 skills validated (10 components, 4 top-level)". `npm test` → 5/5 pass.

### 3.3 Robustness gaps

- **Finding E:** YAML parser fragility, `zip` binary dependency, naive tilde expansion, no copy verification, hardcoded npm-poll (5×10s, no jitter) in `release.yml`.
- **Finding F:** The validator's coverage is structural only. It cannot catch (a) orphan components, (b) semantic contradictions between a component body and `storywright-base` rules, (c) `outputs:` frontmatter that disagrees with the body. All three failure modes are present in the repo today and all passed CI.

### 3.4 Versioning

Conventional Commits + commitlint (husky `commit-msg`). `feat`→minor, `fix/perf/refactor/docs/build`→patch, `chore/ci/test/style`→no release. Healthy. **But** three independent version numbers exist and disagree: `package.json` (1.11.1), `.claude-plugin/plugin.json` (0.1.0), and per-skill `version:` fields (top-level 2.3.0, base 2.2.0, most components 1.0.0, story-formatter 2.0.0 at time of analysis). The per-skill versions were arguably intentional (independent semver per skill), but the manifest at 0.1.0 is plainly stale (Finding B).

---

## 4. Product & DX Evaluation *(EN)*

### 4.1 Value proposition — strong

README opens with the problem and the outcome in one sentence: *"turn ambiguous inputs — vague prompts, half-baked stories, screenshots, Figma links — into Jira-ready user stories with acceptance criteria, edge cases, risks, analytics, and Definition of Done."* Concrete, outcome-oriented, names the artifacts a PM actually needs. A newcomer understands the tool in under two minutes.

### 4.2 Onboarding

- **User path:** `npm install -g @pavp/storywright && storywright install` → restart Claude Code → `/storywright-story-generate "…"`. ~10 min. Low friction.
- **Contributor path:** clone → `npm install` (husky + devDeps) → edit a `SKILL.md` → `npm run validate && npm test`. `CONTRIBUTING.md` + `docs/authoring-a-skill.md` are prescriptive. <1 hour to first contribution.
- **Papercut:** `README.md:29` — `ln -s "$(pwd)/storywright/skills" ~/.claude/skills/storywright` assumes the clone lives in a `storywright/` subdir relative to cwd; a plain `git clone` + `cd storywright` makes that path wrong. Minor but it's the contributor's *first* command.

### 4.3 Learning curve — the hidden cost

The real DX tax is `storywright-base`: **287 lines, 12 hard rules**, plus sub-rules (4a, D, E, F, G), a deterministic pre-split counting table, a context-persistence JSON schema, and a mechanical NxN dependency-matrix algorithm. To safely edit *any* skill you must internalize all of it. For a pack of 4 near-identical skills, that is a steep, centralized rulebook. It's the right *shape* (DRY), but its density means casual contributors will struggle — and explains how the orphan components drifted unnoticed.

### 4.4 Missing for adoption

- **No committed golden outputs.** `examples/` has only 2 *input* files (`input-prompt.md`, `input-figma-link.md`) and zero example *outputs*. `docs/storywright/` is empty (gitignored). A prospective adopter cannot see a real `story.standard.md` without installing and running. This is the single biggest "show, don't tell" gap.
- **No direct Jira/Linear integration.** Output is Markdown + Jira *wiki markup* (copy-paste), not an API push. Reasonable for v1, but it's the obvious next ask from real teams.

---

## 5. Skills Evaluation & Smoke Tests *(EN)*

### 5.1 Smoke test results (run locally, this session)

| Check | Command | Result |
|-------|---------|--------|
| Frontmatter + composition lint | `node scripts/validate-skills.mjs` | ✓ exit 0 — 14 skills validated |
| Tooling smoke + shape invariants | `npm test` (`node --test tests/*.test.mjs`) | ✓ 5/5 pass |
| Orphan detection | `grep _components/ skills/*/SKILL.md` (manual) | ✗ 5 orphans found (no test covers this) |
| Output-contract consistency | manual cross-read of `outputs:` vs body | ✗ figma drift found (no test covers this) |

The automated suite is **green but shallow**: it proves the tooling doesn't crash and the frontmatter shape is valid. It does **not** exercise any skill's actual output, so the two real defects below passed CI.

### 5.2 Per-skill matrix (composed-as-declared vs documented)

| Skill | Purpose | `composes:` (real) | Documented (`architecture.md`) | Drift |
|-------|---------|--------------------|-------------------------------|-------|
| `story-generate` | ambiguous input → story | base + 4 | **9 components** | 🔴 doc claims 9, code has 5 |
| `story-refine` | audit existing story in place | base + 4 | (implied same) | 🟡 |
| `story-split` | oversize → epic + children | base + 4 (invest first) | — | ✓ |
| `story-from-figma` | Figma → 1 story/flow | base + 4 | — | 🟠 outputs 2 files, not 3 |

### 5.3 Finding A (CRITICAL) — orphan components contradict the rulebook

Three layers of inconsistency, all verified:

1. **Orphaned.** `business-rules`, `edge-cases`, `analytics-events`, `risks-and-dependencies`, `definition-of-done` appear in **zero** `composes:` arrays.
2. **Contradictory.** `storywright-base` rule 3 ("No mini-PRDs", `storywright-base/SKILL.md:34-40`) explicitly **prohibits**: *"Edge Cases enumerated as their own section — fold into AC failure paths"*, *"Non-Functional Requirements blocks"*, *"Dependencies as prose"*. Yet `edge-cases/SKILL.md:40` instructs the model to *emit* a `### Edge Cases` section; `risks-and-dependencies` emits deps as prose. The component bodies actively teach the model to break the base rules.
3. **Stale relative to the doc.** `docs/architecture.md:33-44` draws `story-generate` composing all 9 components — describing a *pre-v2.2* design that no longer exists.

**What happened (reconstruction):** the technical content these components produce (edge cases, technical considerations, full DoD) was relocated into the new `story.dev.md` template (the v2.0 "three-file" split separating PM-facing from dev-facing output — see commit `b3bc24f`). But the 5 components were **never** rewritten to target `dev.md`, never re-wired into `composes`, and `architecture.md` was never updated. They are stranded v1.0.0 knowledge.

**Impact:** (a) contributors cannot tell which components are live; (b) if the model loads an orphan (the body says "Invoked by `story-generate`…"), it may emit a base-rule-violating section; (c) the architecture doc actively misleads onboarding.

### 5.4 Finding C (HIGH) — `story-from-figma` output drift

At the time of this analysis, `story-from-figma/SKILL.md` `outputs:` listed `story-1.standard.md`, a wiki-markup story file (since retired), and `flow-summary.md` — **two** story files, and `grep -c dev.md` over that file returned **0**. Meanwhile `story-generate` and `story-refine` both declared `story.dev.md` and the base Application step 10 mandated writing **three** files + context JSON. `CLAUDE.md` still stated "Dual output mandatory" — frozen at the 2-file era. Output shape depended on which entrypoint was used. (Subsequently resolved: the historical trio — which included a wiki-markup-formatted file — was consolidated to a duo: `story.standard.md` + `story.dev.md`.)

### 5.5 Ambiguity handling — well designed (in the live skills)

The wired skills handle ambiguity rigorously: `clarification-questions` asks only blocking questions (≤4, terminal-only via `AskUserQuestion`, never sidecar files — base rule 1); non-blocking gaps become inline `⚠️ Assumed:` markers; language auto-detect with a weighted signal table (rule 4a); a deterministic pre-split counter that forbids "eyeballing"; and **never auto-splits** without explicit user confirmation. Fixtures (`half-baked-story.md`, `oversized-story.md`, `prompt-google-login.md` — Spanish, for language preservation) target exactly these paths. The design quality of the *live* skills is high; the problem is purely the *unmaintained* periphery.

---

## 6. Comparative Analysis *(EN)*

| Dimension | Storywright | deanpeters/Product-Manager-Skills (origin) | Generic coding agent (Claude/Cursor default) | Jira/Linear native AI |
|-----------|-------------|--------------------------------------------|----------------------------------------------|------------------------|
| Distribution | npm + CC skills + claude.ai zip | CC skills | built-in | SaaS feature |
| License | MIT (clean-room) | CC BY-NC-SA (non-commercial) | proprietary | proprietary |
| Multimodal | **text + image + Figma (MCP)** | text-oriented | text + image | text |
| Output | triple file (PM std + Jira wiki + dev) | story templates | freeform | ticket in-tool |
| Methodology | INVEST + Gherkin + mechanical split | INVEST + Humanizing Work | none enforced | light |
| Runtime | none (rides Claude Code) | none | own | own |
| Direct ticket push | ✗ (copy-paste markup) | ✗ | ✗ | ✓ |

**Real differentiators.** (1) Multimodal *fusion* — text + screenshot + Figma in one call with a source-priority matrix and conflict surfacing. (2) Triple-output audience separation (PM vs dev). (3) *Mechanical* INVEST/split (deterministic counter + NxN dependency matrix + per-child value audit) rather than vibes. (4) Terminal-only clarifications + cross-skill context persistence (`.storywright-context.json`). (5) MIT clean-room vs the non-commercial origin — a genuine licensing advantage for commercial teams.

**Missing features.** No committed golden outputs; no Jira/Linear API push (copy-paste only); "multi-provider" is nominal — the skills depend on Claude-specific features in practice; no telemetry on whether generated stories actually pass real refinement.

**Over-engineering.** Ten components where five are dead. A 287-line, 12-rule base for four skills that differ in only three dimensions — the centralization is correct but the rule *surface area* is large for the feature set. The NxN dependency-matrix + per-child V-audit machinery is elaborate for what most teams will use as "make this story less huge."

**Under-engineering.** Test depth (no behavioral/golden tests), the marketplace manifest (broken), and documentation upkeep (architecture doc contradicts code). The gap between the *rigor of the design* and the *rigor of the maintenance* is the project's defining tension.

---

## 7. Detected Weaknesses (prioritized) *(EN)*

| ID | Weakness | Why it matters | Severity |
|----|----------|----------------|----------|
| **A** | 5 orphan components, 3 of which teach behavior `storywright-base` rule 3 forbids; `architecture.md` documents a 9-component composition that doesn't exist | Confuses contributors; risks runtime rule violations; misleads onboarding; rots silently | 🔴 Critical |
| **B** | `plugin.json` v0.1.0 (vs 1.11.1) and omits `storywright-base` (14 on disk, 13 listed) | Marketplace install ships skills without their rulebook → silent degradation | 🟠 High |
| **C** | `story-from-figma` emits 2 story files, no `dev.md`; `CLAUDE.md` says "dual output" | Output shape depends on entrypoint; repo's own guide is wrong | 🟠 High |
| **D** | Tests are smoke + shape only; no golden outputs; `examples/` has no sample outputs | Skill-behavior regressions invisible to CI; adopters can't preview output | 🟡 Medium |
| **E** | Tooling fragility: hand-rolled YAML parser, `zip` hard-dep, naive `~` expansion, no copy verify, README L29 papercut | Edge-case breakage; first-contributor friction | 🟡 Medium/Low |
| **F** | Validator checks ref existence, not usage or semantic coherence | This gap is *why* A/B/C survived CI; fixing it prevents recurrence | 🟡 Medium |

---

## 8. Prioritized Recommendations & Fix Plan *(EN, not executed)*

Each item names the exact file and the concrete change. **Nothing here has been applied.**

### P0 — Stop the drift (do before any new feature)

**P0.1 — Resolve the orphan components (Finding A).** This needs a product decision, framed below (§8 decision). Whichever option is chosen:
- Files: `skills/_components/{business-rules,edge-cases,analytics-events,risks-and-dependencies,definition-of-done}/SKILL.md`, plus `docs/architecture.md:33-44`.
- Update `docs/architecture.md` to show the **real** 5-component composition regardless.

**P0.2 — Fix the marketplace manifest (Finding B).** File: `.claude-plugin/plugin.json`.
- Bump `version` to track `package.json` (or wire it into the release step so it's never manual again).
- Add `"skills/_components/storywright-base"` to the `skills` array (and any other missing component) so marketplace installs ship the rulebook. Cross-check the array against `ls skills/_components/`.

**P0.3 — Align `story-from-figma` to the output contract (Finding C, resolved).** At the time of analysis: `skills/story-from-figma/SKILL.md` (`outputs:` + body, add `story.dev.md` per flow), `CLAUDE.md` ("dual output mandatory" → "triple output"). Subsequently: the trio was consolidated to a duo (standard + dev) and `story-from-figma` was aligned as part of the `consolidate-markdown` SDD change.

### P1 — Make CI catch the next drift (Finding F)

**P1.1 — Orphan check in the validator.** File: `scripts/validate-skills.mjs`. After building the component set, fail (or warn) if any component under `_components/` is referenced by **zero** `composes:` arrays AND zero body `[[ref]]`s. This single check would have caught Finding A.

**P1.2 — Output-contract check.** Add a test asserting all 3 story-producing top-level skills declare the same `outputs:` story-file set. Would have caught Finding C.

**P1.3 — Manifest-vs-disk check.** Add a test asserting `plugin.json.skills` equals the on-disk skill set. Would have caught Finding B.

### P2 — Depth & polish

**P2.1 — Golden outputs (Finding D).** Commit one real generated output per skill under `examples/outputs/` (e.g. `examples/outputs/login-google/story.standard.md`). Add a doc snapshot test that the templates still produce the documented section taxonomy.

**P2.2 — Tooling hardening (Finding E).** `zip-skill.mjs`: detect `zip` or fall back to a Node zip lib; remove redundant path check. `install-skills.mjs`: full `~/` expansion + verify copy count. `release.yml`: add jitter to the npm poll. `README.md:29`: correct the `ln -s` path or switch to an absolute-from-repo-root example.

### §8 decision — orphan components: delete vs. rewire (frame, don't force)

This is a product call for the maintainer, not a unilateral fix. Two clean options:

| Option | What | Pro | Con |
|--------|------|-----|-----|
| **Delete** | Remove the 5 component dirs + their `architecture.md` mentions | Smallest surface; honors rule 3 (their output is banned in story body) | Discards real PM domain knowledge (edge-case axes, analytics taxonomy, risk model) |
| **Rewire to `dev.md`** *(recommended)* | Rewrite the 5 to target `story.dev.md` and add them to the relevant `composes:` | Preserves the work; aligns with the v2.0 PM/dev split where this content now lives | More effort; required updating `story-formatter` / base to invoke them for the dev file |

**Recommendation:** rewire to `dev.md`. The content (8-axis edge cases, analytics naming convention, risk model) is genuinely valuable and was *intentionally* moved to the dev file — it was simply never reconnected. Deleting throws away the most domain-specific assets in the repo. But surface both options to the maintainer.

---

## 9. Quick Wins *(EN)*

Highest value / lowest effort, do today:

1. **`plugin.json`:** bump version + add `storywright-base` (and audit the full skills array). ~10 min. Fixes a broken install path.
2. **`docs/architecture.md:33-44`:** redraw the composition graph to the real 5 components. ~10 min. Stops misleading every reader.
3. **`CLAUDE.md`:** at the time of analysis this was stale — "dual output mandatory" when the system already emitted three files. This was subsequently resolved by consolidating to a duo (standard + dev) and retiring the wiki-markup file.
4. **`scripts/validate-skills.mjs`:** add the orphan-detection check (P1.1). ~30 min. Prevents recurrence of the biggest finding.
5. **`README.md:29`:** fix the `ln -s` path. ~5 min. First-contributor papercut.

---

## 10. Future Risks *(EN)*

- **Drift accelerates.** Near-daily releases with only shape-level CI guarantee that doc/manifest/component drift recurs. Without P1 checks, the next contradiction is weeks away.
- **Marketplace install is broken now.** Until P0.2 lands, anyone installing via the Claude plugin marketplace gets skills missing their `storywright-base` rulebook — and won't get an error, just degraded stories.
- **Conceptual debt compounds.** Dead components that contradict live rules are a trap: a future contributor "reactivating" `edge-cases` would reintroduce rule-3 violations believing they're following the design.
- **Bus factor = 1.** Single maintainer (`pavp`), a 287-line centralized rulebook, and high release velocity. The rulebook's density + lack of behavioral tests means knowledge lives in one person's head; the green-but-shallow CI won't protect a second contributor.
- **"Multi-provider" claim ages poorly.** The more Claude-specific features the skills depend on, the wider the gap between the stated multi-provider stance and reality — a credibility risk if a non-Claude port is ever attempted.

---

## 11. Suggested Improvement Roadmap *(EN)*

**Phase 0 — Consolidate the truth (P0, ~1–2 days).** Resolve orphan components (delete or rewire), fix the manifest, align figma to 3 files, correct `architecture.md` + `CLAUDE.md`. Goal: code, docs, and manifest tell one consistent story.

**Phase 1 — Make CI defend the invariants (P1, ~1 day).** Orphan check, output-contract check, manifest-vs-disk check in the validator/tests. Goal: the next drift fails the PR, not a future audit.

**Phase 2 — Depth & evidence (P2, ~2–3 days).** Commit golden outputs + sample `examples/outputs/`; add a doc-snapshot test for the section taxonomy; harden tooling (zip fallback, tilde expansion, README fix, npm-poll jitter).

**Phase 3 — Figma & contract parity (~1–2 days).** Full `story.dev.md` parity across all entrypoints; per-flow dev notes for figma.

**Phase 4 — Adoption features (scoped later).** Direct Jira/Linear API push (the recurring real-team ask); optional telemetry on whether generated stories survive real refinement; a genuine non-Claude adapter *or* drop the multi-provider claim and lean into Claude-native.

---

### Appendix — Key files cited (with evidence)

- `skills/_components/storywright-base/SKILL.md` — rulebook, 287 lines, 12 hard rules; rule 3 (`:34-40`) prohibits mini-PRD sections.
- `skills/story-generate/SKILL.md:16-21` — `composes:` lists only 5.
- `skills/_components/edge-cases/SKILL.md:40` — instructs emitting the `### Edge Cases` section that rule 3 forbids.
- `skills/story-from-figma/SKILL.md` — `outputs:` = 2 story files + flow-summary; no `dev.md` (`grep -c dev.md` = 0).
- `skills/story-generate/templates/story.dev.md` — where technical content now lives.
- `.claude-plugin/plugin.json` — `version 0.1.0`; 13 skills listed; `storywright-base` absent.
- `docs/architecture.md:33-44` — documents a 9-component composition that the code contradicts.
- `scripts/validate-skills.mjs` — validates ref existence, not usage/coherence.
- `scripts/lib/skills.mjs` — hand-rolled YAML parser, no nesting.
- `.github/workflows/release.yml` — OIDC Trusted Publishing + atomicity gates (strength).
- `tests/skills-shape.test.mjs`, `tests/validate.test.mjs` — shape + smoke only; no golden output.
- `README.md:29` — `ln -s` papercut; `CLAUDE.md` — "dual output" outdated.

*Verificación: este reporte es el único archivo nuevo. Ningún skill, config, script o test fue modificado. Smoke tests citados (`validate` ✓ 14 skills, `npm test` ✓ 5/5) se corrieron en esta sesión.*

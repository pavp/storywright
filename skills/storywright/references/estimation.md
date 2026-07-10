## Purpose

Estimation gives the team a planning anchor grounded in story complexity signals — not gut feel or velocity. This component reads six structural signals from the completed story drafts and the INVEST result, runs a deterministic weighted formula, maps the raw score to a Fibonacci bucket, then allows a bounded ±1 LLM adjustment when a named signal justifies it.

Output lives **exclusively** in `story.dev.md`. PM files (`story.standard.md`, `backlog-summary.md`) must never contain the full estimation table. `backlog-summary.md` may carry a lightweight `## Backlog Estimate` planning aid (Points + Key Driver only) — that is a batch-intent concern, not this component's output.

## When to use

Invoked as step 8c of `references/storywright-base.md` — **after step 9 (INVEST)** so the E verdict is available, **before step 10 (render)**. Never run before INVEST; the E verdict is a required input.

## Inputs & interpretation

- **story-context** — the completed canonical block (PM draft + dev draft) and the step-9 INVEST E verdict.
- ACs and Business Rules are counted from `story.standard.md` (the PM draft).
- Edge cases, dependencies, and high-severity risks are counted from `story.dev.md` (the dev draft).
- The INVEST E verdict comes directly from step 9 output.

## Application (step-by-step)

### 1. Short-circuit: E = FAIL → Spike

If step-9 INVEST yields `E — FAIL` (estimability failure), **do not run the formula**. Emit the Spike block and stop:

```
## Estimate

**Story Points: Spike — estimate after spike completes**

> ⚠️ This story has unresolved unknowns (INVEST E = FAIL). Run a technical spike first, then re-estimate once the unknowns are resolved.
```

### 2. Extract the six signals

Read across both files:

| Signal | Source file | Extraction rule |
|--------|-------------|-----------------|
| `ac_count` | `story.standard.md` | Count `**AC-\d+` pattern occurrences |
| `rule_count` | `story.standard.md` | Count `^\d+\.` numbered rules; multi-variant rule (sub-bullets or `> ⚠️ Confirm:`) = 2 units; plain/inline-clause = 1 unit |
| `edge_count` | `story.dev.md` | Count `^- \*\*` bullets under `^#{2,3} Edge Cases` section |
| `dep_count` | `story.dev.md` | Count body rows under `^#{2,3} Dependencias` section |
| `risk_hh_count` | `story.dev.md` | Count rows with 🚨 glyph under `^#{2,3} Riesgos` section (flagged high-severity only) |
| `e_fail` | INVEST step-9 output | 1 if `E — FAIL`, else 0 (already handled in step 1) |

**Section anchors are H2 by default** (`## Edge Cases`, `## Dependencias`, `## Riesgos`). Use the depth-agnostic pattern `^#{2,3}` as a fallback to tolerate H3 headings in non-standard goldens.

**Source split is mandatory.** ACs and business rules live only in the PM draft, not the dev draft. Edge cases, deps, and risks live only in the dev draft. Counting from the wrong file produces zero for those signals.

### 3. Compute raw score

```
raw = ac_count×1.0 + edge_count×0.6 + dep_count×1.5 + risk_hh_count×2.0 + rule_count×0.5
```

### 4. Map to Fibonacci bucket

| Condition | Points |
|-----------|--------|
| raw ≤ 1.5 | 1 |
| raw ≤ 3.5 | 2 |
| raw ≤ 7.0 | 3 |
| raw ≤ 12.5 | 5 |
| raw ≤ 18.0 | 8 |
| raw > 18.0 | 13 |

### 5. Apply ±1 LLM adjustment (optional, bounded)

You may adjust the deterministic bucket by exactly ±1 Fibonacci step **only if** you can cite one of the six named signals as the reason. A generic statement ("this feels complex") is not a valid citation.

Format for the adjustment row:
- With adjustment: `±1 → <new_points>: <signal_name> — <one-sentence reason>`
- Without adjustment: `none — deterministic bucket retained`

No citation means no adjustment. Use the bucket as-is.

### 6. Split advisory for 13-point stories

If the final point value is 13, append this advisory after the `## Estimate` section:

```
> ⚠️ Consider splitting: a 13-point story signals high complexity. Run `/storywright-story-split` to explore children — approval required before splitting.
```

This is advisory only. Never auto-split. Never change the point value.

### 7. Emit ## Estimate in story.dev.md

Place after the Definition of Done section, before the generation log.

```markdown
## Estimate

**Story Points: N** (Fibonacci)

| Signal | Value | Weight | Contribution |
|--------|-------|--------|--------------|
| Acceptance Criteria | <ac_count> | ×1.0 | <ac_count × 1.0> |
| Edge Cases | <edge_count> | ×0.6 | <edge_count × 0.6> |
| Dependencies | <dep_count> | ×1.5 | <dep_count × 1.5> |
| High-severity Risks 🚨 | <risk_hh_count> | ×2.0 | <risk_hh_count × 2.0> |
| Business Rules | <rule_count> | ×0.5 | <rule_count × 0.5> |
| **Raw score** | | | **<raw>** → bucket <det_points> |
| LLM adjustment | | | <adjustment row> |

> Planning note: story points reflect relative complexity, not time, commitment, or velocity. Use them to compare stories against the calibration anchors below — not to forecast hours.
```

## Calibration anchors

These real fixtures ground the scale. Use them to sanity-check your estimates before emitting:

| Anchor | AC | Edge | Dep | 🚨 | Rules | Raw | Points | Notes |
|--------|----|------|-----|----|-------|-----|--------|-------|
| Synthetic simple | 1 | 0 | 0 | 0 | 0 | 1.0 | 1 | Single AC, no risk |
| Synthetic small | 1 | 1 | 1 | 0 | 1 | 2.6 | 2 | Minimal enrichment |
| Synthetic medium | 2 | 2 | 1 | 0 | 2 | 5.7 | 3 | Moderate AC/edge |
| login-google | 1 | 5 | 3 | 1 | 3 | 12.0 | 5 | Auth flow, real golden |
| backlog story-1 | 3 | 5 | 3 | 0 | 2 | 11.5 | 5 | Cart summary, real golden |
| backlog story-2 (pre-adj) | 3 | 5 | 4 | 0 | 3 | 13.5 | 8 | Discount code, real golden |
| Synthetic large | >9 | >5 | >5 | >1 | >3 | >18.0 | 13 | Split advisory fires |

## Worked example: story-2 ±1 adjustment

Story-2 (discount code) raw = 13.5 → deterministic bucket 8.

LLM adjustment: −1 → 5. Citation: dependency "Resumen del carrito (Story 1 — AC-1)" — this is an intra-batch sibling already in-progress (Story 1), reducing uncertainty compared to a net-new external dep.

Adjustment row: `−1 → 5: dep "Resumen del carrito (Story 1 — AC-1)" — intra-batch sibling already in-progress reduces implementation uncertainty`

Final: **Story Points: 5**

## Common Pitfalls

- **Running step 8c before step 9 INVEST** — E verdict not yet available; do not skip INVEST ordering.
- **Matching bare `###` headings in dev.md** — use the depth-agnostic `^#{2,3}` pattern; real goldens use `## H2` sections.
- **Counting ACs or rules from dev.md** — they are PM-file signals only; dev.md has none.
- **Counting edge/dep/risk from standard.md** — they are dev-file signals only; standard.md has none.
- **Applying ±1 without a named signal citation** — if you cannot cite a specific signal, retain the deterministic bucket.
- **Auto-splitting a 13-point story** — the advisory is informational; splitting requires user approval via the split intent.
- **Emitting ## Estimate in story.standard.md** — estimation lives in dev.md only; Rule H bans it from PM files.

## References

- `references/storywright-base.md`
- `references/invest-checklist.md`
- `references/edge-cases.md`
- `references/risks-and-dependencies.md`
- `references/business-rules.md`
- `references/acceptance-criteria.md`

<claude-specific>
Respond in the user's detected language (auto-detected per storywright-base rule 4). The computation and table structure are language-neutral; translate labels (Signal, Value, Weight, Contribution, Planning note) to match.
</claude-specific>

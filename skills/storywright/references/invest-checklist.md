## Purpose

INVEST is the gate that separates ready stories from epics in disguise. Score honestly. Failures here are signals, not opinions.

## When to use

- After the generate intent drafts a story → run to confirm readiness.
- At the start of the split intent → use the failure reasons as the split rationale.

## Inputs & interpretation

- **story-draft** — full story content (title + sections)

## Application (step-by-step)

For each dimension, mark PASS / FAIL and write one sentence of evidence.

1. **I — Independent**
   PASS if the story can be delivered without waiting on another story.
   FAIL if it explicitly depends on uncommitted work or requires a parallel change in another team's surface.

2. **N — Negotiable**
   PASS if scope can shift without breaking the story (the user/team retains flexibility on HOW).
   FAIL if the story over-specifies implementation (specific endpoints, exact pixel values mandated, locked tech).

3. **V — Valuable**
   PASS if the value statement names a user or business outcome.
   FAIL if the only beneficiary is "the system" or it's purely technical with no surfaced value.

4. **E — Estimable**
   PASS if the team can confidently size it within their tolerance band (e.g., ≤8 SP).
   FAIL if unknowns dominate (spike-shaped) or the surface is too broad.

5. **S — Small**
   PASS if it fits one sprint AND has exactly one Gherkin `When`/`Then` pair AND touches ≤2 related surfaces.
   FAIL if it visibly mixes ≥2 distinct flows, OR has >1 `When`/`Then` pair (multi-outcome = scope creep, Cohn anti-pattern), OR touches ≥3 unrelated surfaces.

6. **T — Testable**
   PASS if every AC has an observable outcome.
   FAIL if ACs hand-wave behavior or rely on subjective judgment.

7. **Anti-PRD sanity (storywright-specific)**
   If the rendered story body exceeds ~60 lines excluding user-supplied Preconditions/Out-of-Scope blocks, treat as a spec, not a story. FAIL `Small`. Force `SPLIT RECOMMENDED`.

7. Emit the report block:
   ```
   ### INVEST Check
   - I — PASS · <evidence>
   - N — PASS · <evidence>
   - V — FAIL · <evidence>
   - E — PASS · <evidence>
   - S — FAIL · <evidence>
   - T — PASS · <evidence>

   **Verdict:** READY | NEEDS REFINEMENT | SPLIT RECOMMENDED
   ```

8. **Verdict logic:**
   - All PASS → `READY`
   - **V FAILS → `NOT A STORY`**. Hard stop. This is a tech task or infrastructure work, not a user story. Do not refine, do not split — reframe with user-visible value or combine with related user-facing work.
   - **T FAILS → `NEEDS REFINEMENT`**. Fix ACs in place via the refine intent. Do NOT split — splitting untestable input produces untestable children.
   - **N FAILS → `NEEDS REFINEMENT`**. The story over-prescribes implementation; rewrite to focus on outcome, not solution.
   - **E FAILS due to unknowns → `RUN A SPIKE`**. Recommend a 1–2 day time-boxed investigation before splitting.
   - **I, E (size-driven), or S FAIL → `SPLIT RECOMMENDED`**. Switch to the split intent.

   **T-before-S/E precedence (DECIDED, not an author judgment call).** When **T FAILS simultaneously with S and/or E (size-driven)**, resolve **T FIRST**: refine the untestable ACs in place via the refine intent, THEN re-run this INVEST check and re-evaluate whether a split is still warranted. Rationale: splitting untestable input produces untestable children — making the ACs testable is a precondition for a sound split, not a parallel concern. This precedence is fixed: T always wins the tie against S/E. It does NOT change either verdict's individual target action (T still routes to refine, S/E still routes to split) — it only orders them when both fire at once. The existing hard-stop verdicts outrank this tie-break where they also fire: **V FAILS → `NOT A STORY`** and **N FAILS → `NEEDS REFINEMENT`** are unchanged and still take precedence over T-vs-S/E.

9. Never auto-split here. Output is advisory only.

## Examples

### Good

```
### INVEST Check
- I — PASS · No upstream dependencies; auth provider is already integrated.
- N — PASS · Implementation is open beyond "use existing GoogleSignIn SDK".
- V — PASS · Reduces signup friction for users without an account.
- E — FAIL · Account-linking edge case requires backend schema research (spike-shaped).
- S — FAIL · Covers web AND mobile AND account-linking in one story.
- T — PASS · Each AC has observable outcomes.

**Verdict:** SPLIT RECOMMENDED
```

### T-before-S/E precedence (worked example)

```
### INVEST Check
- I — PASS · No upstream dependencies.
- N — PASS · Implementation approach is open.
- V — PASS · Reduces manual triage time for support agents.
- E — PASS · Sized within tolerance once scope is fixed.
- S — FAIL · Story bundles "todo rápido y sin errores" across 4 unrelated flows.
- T — FAIL · ACs read "todo rápido y sin errores" — no observable outcome, can't test pass/fail.

**Verdict:** NEEDS REFINEMENT (T-before-S/E: resolve T first via the refine
intent — rewrite ACs with observable outcomes — THEN re-run this check. Only
after T passes does the S FAIL re-evaluation route to SPLIT RECOMMENDED.)
```

### Bad

`Verdict: READY` with no per-dimension evidence — review can't audit it.

## Common Pitfalls

- Calling a story `Small` because it's described in few sentences. Size is about scope, not word count.
- Calling a story `Testable` when ACs only exist for the happy path.
- Lumping `Independent` and `Negotiable` into one check.

## References

- the split intent (this skill)
- `references/acceptance-criteria.md`
- `references/definition-of-done.md`

<claude-specific>
Use extended thinking. The dimensions interact (small often forces independent). Resolve all six before emitting verdict.
</claude-specific>

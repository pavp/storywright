## Purpose

A Definition of Done is the contract for "shippable". It must be **checkable, observable, and binary** — never aspirational.

## When to use

Invoked after acceptance criteria and technical considerations are drafted. DoD is **dual-rendered** (see `references/story-formatter.md`): `story.standard.md` carries the **acceptance-only** DoD projection (no CLI commands, no file-level criteria, plain `- ` bullets — no `- [ ]` checkboxes); `story.dev.md` carries the **full** DoD including CLI commands (`npm run test`), file-level lines, and `- [ ]` checkboxes. Produce both projections from the baseline below: PM projection = drop command/file lines AND strip `[ ]` to plain `- `; dev projection = keep everything including `- [ ]`.

## Inputs & interpretation

- **story-context** — what's being built
- **technical-considerations** — surface (frontend, backend, mobile) drives which DoD lines apply

## Application (step-by-step)

1. Start from the baseline list below.
2. Drop lines that don't apply (e.g., no analytics if the story is purely internal).
3. Add story-specific lines from technical considerations (e.g., "Database migration runs cleanly on staging").
4. Use checkbox markdown (`- [ ]`) so reviewers can tick during review. **PM projection exception:** when rendering the DoD for `story.standard.md`, replace `- [ ]` with plain `- ` bullets — Jira Cloud does not autoformat task-list syntax. `story.dev.md` keeps `- [ ]` unchanged.

### Baseline DoD

```
### Definition of Done
- [ ] Code merged to main behind feature flag (if applicable)
- [ ] All acceptance criteria pass in QA environment
- [ ] Unit tests added/updated; coverage not decreased
- [ ] Integration / E2E test added for the happy path and at least one failure mode
- [ ] Accessibility: keyboard navigable, screen-reader labels, color contrast ≥ WCAG AA
- [ ] Analytics events implemented and verified in dashboard
- [ ] Error states surfaced to user with actionable copy
- [ ] Translations added for all user-facing strings (per project locale list)
- [ ] Documentation updated (README / runbook / API docs as relevant)
- [ ] Reviewed by ≥1 engineer; PM signoff after acceptance walkthrough
- [ ] No regressions in critical-path E2E suite
```

5. Emit only the block. Do NOT add prose around it.

## Examples

### Good

A backend-only story drops the WCAG line, keeps unit/integration tests, adds a migration line.

### Bad

`- [ ] Quality is good` — not checkable.

## Common Pitfalls

- Treating DoD as aspirational. Every box must be objectively tickable.
- Copy-pasting a generic DoD onto every story. Trim what doesn't apply.
- Confusing DoD with AC. AC = "what does this story do?". DoD = "what does shippable mean for any story in this team?".

## References

- `references/acceptance-criteria.md`
- `references/analytics-events.md`

<claude-specific>
Cache the baseline DoD block across calls in the session.
</claude-specific>

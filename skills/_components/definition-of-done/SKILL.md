---
name: definition-of-done
description: Produce a Definition of Done block for a user story. Covers code, tests, analytics, docs, accessibility, and release gates. Returns only the DoD block.
trigger: "internal use by story-* skills"
intent: Component skill that emits a baseline DoD aligned to common product/eng standards. Customizable via project-level overrides documented in the story.
version: 2.0.0
inputs:
  - story-context
  - technical-considerations
outputs:
  - definition-of-done-block
---

## Purpose

A Definition of Done is the contract for "shippable". It must be **checkable, observable, and binary** — never aspirational.

## When to use

Invoked after acceptance criteria and technical considerations are drafted. DoD is **dual-rendered** (see `[[jira-wiki-formatter]]`): the PM-facing files (`story.standard.md` / `story.jira-wiki.md`) carry the **acceptance-only** DoD (no CLI commands, no file-level criteria); `story.dev.md` carries the **full** DoD including CLI commands (`npm run test`) and file-level lines. Produce both projections from the baseline below: PM projection = drop command/file lines; dev projection = keep everything.

## Inputs & interpretation

- **story-context** — what's being built
- **technical-considerations** — surface (frontend, backend, mobile) drives which DoD lines apply

## Application (step-by-step)

1. Start from the baseline list below.
2. Drop lines that don't apply (e.g., no analytics if the story is purely internal).
3. Add story-specific lines from technical considerations (e.g., "Database migration runs cleanly on staging").
4. Use checkbox markdown (`- [ ]`) so reviewers can tick during review.

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

- [[acceptance-criteria]]
- [[analytics-events]]

<claude-specific>
Cache the baseline DoD block across calls in the session.
</claude-specific>

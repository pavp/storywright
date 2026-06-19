<!--
PR title MUST be a Conventional Commit (enforced by the pr-title workflow):
feat: / fix: / docs: / refactor: / perf: / build: / ci: / chore: / test: / style:
Breaking changes: add `!` after the type, e.g. `feat!: rename install command`.
Squash-merge uses this title as the release-triggering commit subject.
-->

## Summary

<!-- 1–3 bullets: what changed and why. -->

## Skills / components touched

<!-- List which `skills/*` or `_components/*` were edited, or "none". -->

## Output impact

<!-- Does the shape of story.standard.md / story.dev.md change? -->

- [ ] No change to story output shape
- [ ] Output shape changed — golden outputs in `examples/outputs/` updated

## Validation

<!-- CI already runs `npm run validate` + `npm test`; confirm the human-only check. -->

- [ ] Manually invoked the affected skill in Claude Code and got sensible output

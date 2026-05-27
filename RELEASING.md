# Releasing & Rollback

## How releases happen

Push to `main` → `.github/workflows/release.yml` runs `semantic-release`. No manual `npm version` or `npm publish`.

## Channels

v1 has a single `latest` tag on npm. Pre-release channels (`beta`, `next`) can be added later by configuring `branches` in `.releaserc.json`.

## Rollback

If a published release is broken:

1. **Re-point `latest` to the previous good version** (fast, non-destructive):
   ```bash
   npm dist-tag rm @pavp/storywright latest
   npm dist-tag add @pavp/storywright@<previous-good-version> latest
   ```
2. **Revert the offending commit on main**:
   ```bash
   git revert <sha>
   git push origin main
   ```
   This triggers a new release that does not re-introduce the bug.
3. **Yank only as a last resort** (within 72h of publish; surfaces a warning to consumers):
   ```bash
   npm deprecate @pavp/storywright@<bad-version> "Yanked: <reason>; use <good-version>"
   ```
   Avoid `npm unpublish` — it breaks dependency trees.

## Pre-flight before merging to main

- CI required check: `validate` + `test` must be green.
- PR title must pass Conventional Commits (commitlint runs in CI).
- For multi-commit PRs, prefer squash-merge so the merge commit drives the version bump.

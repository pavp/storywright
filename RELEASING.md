# Releasing & Rollback

## How releases happen

Push to `main` → `.github/workflows/release.yml` runs `semantic-release`. No manual version bump, no package registry publish. The output is a git tag, a `CHANGELOG.md` entry, and a GitHub Release — that's the entire distributable artifact. skills.sh (`npx skills`) and git-clone consumers pin a version by pointing at that tag.

## Channels

v1 has a single release line off `main`. Pre-release channels (`beta`, `next`) can be added later by configuring `branches` in `.releaserc.json`.

## Rollback

If a published release is broken:

1. **Revert the offending commit on `main`** (primary path, non-destructive):
   ```bash
   git revert <sha>
   git push origin main
   ```
   This triggers a new release (a patch/minor bump) that does not re-introduce the bug. Consumers pulling `main` or the newest tag get the fix on their next pull.

2. **Delete the bad tag** — `<bad-tag>` is the existing `vX.Y.Z` tag that `semantic-release` already created for the broken release (not a name you invent):
   ```bash
   git push origin :refs/tags/<bad-tag>
   git tag -d <bad-tag>
   ```
   This is the recommended path: it removes the bad pin without rewriting history other consumers may have already fetched.

   Force-moving the tag onto the previous good SHA is a **discouraged alternative** — only reach for it if a consumer's tooling hard-pins that exact tag name and cannot be repointed to a new tag:
   ```bash
   git tag -f <bad-tag> <previous-good-sha>
   git push origin <bad-tag> --force
   ```
   Decision rule: delete by default; force-move only when you cannot get affected consumers onto a different tag at all.

3. **Edit or delete the GitHub Release** tied to the bad tag (via the GitHub UI or `gh release edit`/`gh release delete`) to mark it broken or remove it from the Releases list, so it stops showing as the latest recommended version.

4. **Cut a new patch release** with the fix (step 1) rather than trying to mutate history — this keeps the CHANGELOG accurate and gives consumers a clean forward path.

Avoid rewriting already-pushed tags that consumers may have fetched; prefer forward-fixing via a new release over retroactive tag surgery.

## Pre-flight before merging to main

- CI required check: `validate` + `test` must be green.
- PR title must pass Conventional Commits (commitlint runs in CI).
- For multi-commit PRs, prefer squash-merge so the merge commit drives the version bump.

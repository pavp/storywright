# Contributing

Thanks for considering a contribution. This repo holds Markdown skill files plus a thin npm installer. Most contributions are skill additions or edits — see the authoring guide.

## Conventional Commits

PR titles and commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add story-points-estimate component
fix(story-formatter): escape pipes inside table cells
docs(readme): clarify MCP setup
chore: bump dev deps
feat!: rename CLI install command
```

`feat!` (or `BREAKING CHANGE:` in the body) triggers a major bump. `feat` → minor. `fix`/`perf`/`refactor`/`docs`/`build` → patch. `ci`/`chore`/`test`/`style` → no release.

## Local setup

```bash
npm install         # installs husky + commitlint + semantic-release
npm run validate    # lints all skills
npm test            # runs node --test against tests/
```

## Authoring a skill

See [`docs/authoring-a-skill.md`](./docs/authoring-a-skill.md).

Required frontmatter fields: `name`, `description`, `trigger`, `intent`, `version`. Required sections: `## Purpose`, `## Application`. The validator (`scripts/validate-skills.mjs`) enforces both.

## Reviewing a PR

- Run `npm run validate` and `npm test`.
- Manually invoke the affected skill in Claude Code with the example fixtures in `tests/fixtures/`.
- Check that both outputs render correctly in Jira Cloud and in any CommonMark viewer.

## Release flow

Maintainers do not version manually. Push to `main` triggers `.github/workflows/release.yml`, which runs `semantic-release`:

1. Analyzes commits since last tag
2. Bumps version in `package.json`
3. Updates `CHANGELOG.md`
4. Publishes to npm via Trusted Publishing (OIDC)
5. Creates a GitHub Release with notes

See [RELEASING.md](./RELEASING.md) for rollback procedure.

## Code of conduct

Be excellent. Don't be condescending in reviews. Assume good intent.

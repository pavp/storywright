# storywright — dogfood guide

This file tells Claude Code how to behave when invoked in this repo.

## Repo type

Skills pack for Claude Code. Markdown-driven. The npm package is a thin installer; no runtime.

## When working in this repo

1. **Adding/editing a skill**: edit the `.md` in `skills/` or `skills/_components/`. Keep frontmatter complete (`name`, `description`, `trigger`, `intent`, `version`). Run `npm run validate` before committing.
2. **Composition is enforced**: top-level skills must list their components in `composes:` and the validator verifies each exists.
3. **Output language**: skills should respond in the input language. Don't force English.
4. **Never auto-split a story**: even with extended thinking, splitting always waits for user confirmation in `story-split`.
5. **Clean room**: do not copy content from `deanpeters/Product-Manager-Skills`. License is incompatible (CC BY-NC-SA → MIT). Inspired-by only.

## Repo conventions

- Conventional Commits required (commitlint via husky).
- Node 20+ for scripts.
- Pure ESM (`"type": "module"` + `.mjs`).
- No build step. Scripts are runnable directly.

## Working with skills inside Claude Code

The 4 top-level skills:

- `story-generate` → ambiguous input → full story
- `story-refine` → existing story → upgraded
- `story-split` → too-big story → epic + children
- `story-from-figma` → Figma link → stories per flow

Use them dogfood-style when iterating: invoke the skill against `tests/fixtures/` examples.

## Validation

```bash
npm run validate    # frontmatter + structure
npm test            # snapshot tests
```

Both run in CI; both must pass to merge.

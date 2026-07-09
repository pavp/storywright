# Authoring a Skill

storywright ships **one** install unit: `skills/storywright/SKILL.md` (the router). Its `references/<name>.md` files carry the rules; they have no frontmatter and are read on demand, never installed as separate skills.

## Minimal frontmatter (the SKILL.md router only)

```markdown
---
name: storywright
description: One sentence (≤200 chars) describing what the skill does and when it fires.
trigger: "literal phrase | another phrase"
intent: Longer repo-facing description of the skill's purpose.
version: 1.0.0
---
```

Optional fields:
- `inputs:` — list of supported input types (text, image, etc.)
- `outputs:` — list of artifacts the skill produces

There is no `composes:` field. Instead, the router body links each `references/<name>.md` it depends on (via `[[name]]` or a plain `references/<name>.md` path) — the validator checks these links resolve, not a frontmatter list.

## Adding or editing a reference file

A reference lives at `skills/storywright/references/<name>.md`. It carries **no frontmatter** — it is not an install unit, and `findSkillFiles()` only walks for files literally named `SKILL.md`. Link it from the router body (or from another reference body) so the validator's orphan check passes.

## Required body sections (the router)

The validator enforces, on `skills/storywright/SKILL.md` only:
- `## Purpose` — why this skill exists
- `## Application` — the intent dispatch (`### Routing`) plus one `#### <intent>` delta subsection per intent; the base Application *skeleton* (the numbered production steps) lives in `references/storywright-base.md`, not here

Recommended sections:
- `## When to use`
- `## Inputs & interpretation`
- `## Examples` (Good + Bad)
- `## Common Pitfalls`
- `## References` (list the `references/*.md` files this skill reads)

## `<claude-specific>` blocks

End the file with an optional `<claude-specific>` XML block holding Claude-tuned directives:

```markdown
<claude-specific>
- Use extended thinking for INVEST verdicts.
- Cache the section taxonomy.
</claude-specific>
```

Non-Claude LLMs ignore unknown XML.

## Naming rules

- `name`: kebab-case, ≤64 chars, unique across the repo
- `description`: ≤200 chars
- Folder name should match `name`

## Validation

```bash
npm run validate
```

Fails if any of: missing required frontmatter, missing required sections, non-kebab-case name, description too long, a `[[name]]`/`references/<name>.md` link that does not resolve to a real reference file, or a reference file that no body links (orphaned).

## Before you submit

1. Add a fixture in `tests/fixtures/` if you're adding a new intent
2. Manually invoke the skill in Claude Code against the fixture
3. Open a PR with a Conventional Commit title (`feat:` for new behavior, `fix:` for a correction)

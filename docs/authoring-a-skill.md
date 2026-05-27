# Authoring a Skill

A skill is one Markdown file: `skills/<name>/SKILL.md` for top-level, `skills/_components/<name>/SKILL.md` for components.

## Minimal frontmatter

```markdown
---
name: my-skill
description: One sentence (≤200 chars) describing what the skill does and when it fires.
trigger: "literal phrase | another phrase"
intent: Longer repo-facing description of the skill's purpose.
version: 1.0.0
---
```

Optional fields:
- `inputs:` — list of supported input types (text, image, figma-link, etc.)
- `outputs:` — list of artifacts the skill produces
- `composes:` — list of `_components/<name>` referenced by this skill (validator checks each exists)

## Required body sections

The validator enforces:
- `## Purpose` — why this skill exists
- `## Application` — step-by-step procedure

Recommended sections:
- `## When to use`
- `## Inputs & interpretation`
- `## Examples` (Good + Bad)
- `## Common Pitfalls`
- `## References` (link related skills with `[[name]]`)

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

Fails if any of: missing required frontmatter, missing required sections, non-kebab-case name, description too long, `composes:` references a missing component.

## Before you submit

1. Add a fixture in `tests/fixtures/` if the skill is top-level
2. Manually invoke the skill in Claude Code against the fixture
3. Open a PR with a Conventional Commit title (`feat:` for a new skill, `fix:` for a correction)

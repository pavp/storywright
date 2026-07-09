# Quickstart

## 1. Install

Via skills.sh:
```bash
npx skills add pavp/storywright
```

Or a direct git clone into your agent's skills directory:
```bash
git clone git@github.com:pavp/storywright.git ~/.claude/skills/storywright
```

Restart Claude Code (or your agent) so the skill files are picked up.

## 2. Run your first story

In Claude Code:

```
generate a user story: Permitir login con Google
```

Claude will:

1. Detect that the input is a vague feature prompt.
2. Run a gap check and ask up to 3 critical clarifying questions.
3. Draft the full story across 15 sections.
4. Run an INVEST self-check.
5. Render `story.standard.md` (PM-facing) and `story.dev.md` (dev-facing).

## 3. Refine an existing story

```
refine this story:

Title: Filter dashboard
As a user, I want to filter the dashboard so I can see what I want.
AC: It should work.
```

Claude will preserve what's good, fill what's missing, surface what's blocked.

## 4. Split a too-big story

```
this story is too big, split it:

<paste an oversize story>
```

Claude proposes a split plan in a table. You approve / adjust / cancel. Children are only written after approval.

---
description: Transform an ambiguous prompt, screenshot, or Figma link into a Jira-ready user story
argument-hint: <prompt | paste story | attach image | figma URL>
---

Invoke the `story-generate` skill from the storywright pack to handle the following input:

$ARGUMENTS

Follow the skill's full procedure:

1. Detect input types present (text / image / figma-link / mixed).
2. If multi-source, apply the source-priority matrix and surface conflicts as BLOCKING clarifications BEFORE drafting.
3. Run gap check via `clarification-questions` component. Ask at most 3 critical questions if anything is blocking.
4. Fill the CORE sections (Title, Summary, User Story, Acceptance Criteria, Definition of Done).
5. Fill optional sections only if they have real content (drop empty ones).
6. Run INVEST pre-split test. If count ≥2, show candidate children + ask via `AskUserQuestion` with options: "Yes, split" / "Continue without split" / "No, keep as-is". Never auto-split silently. For other verdicts (NOT A STORY / NEEDS REFINEMENT / RUN A SPIKE) — STOP and hand off accordingly.
7. Render two outputs via `story-formatter` to `docs/storywright/YYYY-MM-DD-HHmm-<title-slug>/` (current local time, title kebab-case max 5 words). Use the `Write` tool for all files — never ask:
   - `story.standard.md` — PM-facing CommonMark: observable behavior only, no file paths/imports/component names/CLI commands; DoD uses plain `- ` bullets (no checkboxes); no pipe tables
   - `story.dev.md` — dev-facing CommonMark: full technical detail (file paths, imports, Technical Considerations, technical edge cases, DoD with `npm run` commands and `- [ ]` checkboxes)
   - `.storywright-context.json` — resolved session answers: `{"language":"...","persona":"...","naming_pattern":null,"output_folder":"...","resolved_questions":[],"sibling_refs":[]}`
   Emit `story.standard.md` as a fenced code block in chat. Do NOT emit `story.dev.md` in chat.
8. Non-blocking assumptions remain? Mark inline with `⚠️ Assumed:`. Do NOT emit clarifications.md.

Output in the input language (preserve es/en).

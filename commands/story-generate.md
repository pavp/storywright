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
7. Render dual outputs via `jira-wiki-formatter`. Use the `Write` tool to write `story.standard.md` and `story.jira-wiki.md` to `docs/storywright/YYYY-MM-DD-HHmm-<title-slug>/` (current local time, title in kebab-case max 5 words). Also emit both as fenced code blocks in chat. Then write `.storywright-context.json` to the same folder with all resolved answers from this session: `{"language":"...","persona":"...","naming_pattern":null,"output_folder":"...","resolved_questions":[],"sibling_refs":[]}`. Never ask — always write all three files.
8. Non-blocking assumptions remain? Mark inline with `⚠️ Assumed:`. Do NOT emit clarifications.md.

Output in the input language (preserve es/en).

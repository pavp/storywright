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
6. Run INVEST self-check. If NOT A STORY / NEEDS REFINEMENT / RUN A SPIKE / SPLIT RECOMMENDED — STOP and hand off accordingly.
7. Render dual outputs: `story.jira-wiki.md` (Jira wiki markup) and `story.standard.md` (CommonMark).
8. If clarifications remain, emit `clarifications.md` and mark the story DRAFT.

Output in the input language (preserve es/en).

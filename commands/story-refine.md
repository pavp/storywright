---
description: Audit an existing user story and fill gaps in place
argument-hint: <paste existing story>
---

Invoke the `story-refine` skill from the storywright pack to audit and improve this story:

$ARGUMENTS

Follow the skill's procedure:

1. Parse the existing story into the section taxonomy. Mark each section: present / missing / weak.
2. Gap-check weak sections via `clarification-questions`. Ask only BLOCKING questions.
3. Detect language and preserve it in output.
4. Fill missing/weak sections via component skills. Preserve original wording where good.
5. Append a "Refinement log" at the end listing what changed.
6. Run INVEST. If verdict is `SPLIT RECOMMENDED`, stop and recommend `/story-split` instead.
7. Render dual outputs via `jira-wiki-formatter`.
8. Emit `clarifications.md` if assumptions remain unresolved.

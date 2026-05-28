---
description: Audit an existing user story and fill gaps in place (supports text + optional image / Figma companion)
argument-hint: <paste existing story> [+ attach image or paste Figma URL for cross-source check]
---

Invoke the `story-refine` skill from the storywright pack to audit and improve this story:

$ARGUMENTS

Follow the skill's procedure:

0. Detect companion sources (image, figma-link). If present, run conflict detection between the story text and the design BEFORE filling sections. Surface conflicts as BLOCKING clarifications; never silently rewrite the story to match the design.
1. Parse the existing story into the section taxonomy. Mark each section: present / missing / weak.
2. Gap-check weak sections via `clarification-questions`. Ask only BLOCKING questions.
3. Detect language and preserve it in output.
4. Fill missing/weak sections via component skills. Preserve original wording where good.
5. Append a "Refinement log" at the end listing what changed.
6. Run INVEST pre-split test. If count ≥2, show candidate children + ask via `AskUserQuestion` with options: "Yes, split" / "Continue without split" / "No, keep as-is". Never auto-split silently.
7. Render dual outputs via `jira-wiki-formatter`.
8. Emit `clarifications.md` if assumptions remain unresolved.

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
6b. Resolve grounding (storywright-base rule 13 / step 7b): if `.storywright-context.json` lacks `source_grounding`, ask once via `AskUserQuestion` — "Infer from the requirement" (default → `inferred`) vs "Confirm against my open code" (→ `workspace-confirmed`). Persist it. If `workspace-confirmed`, use native Read/Grep/Glob to confirm real endpoints/flags/paths for `story.dev.md`; mark anything not found `⚠️ Assumed`; empty workspace → fall back to `inferred` once, no re-ask.
7. Render three outputs via `jira-wiki-formatter` to `docs/storywright/YYYY-MM-DD-HHmm-<title-slug>/` (current local time, title kebab-case max 5 words). Use the `Write` tool for all files — never ask:
   - `story.standard.md` — PM-facing CommonMark: observable behavior only, no file paths/imports/component names/CLI commands
   - `story.jira-wiki.md` — PM-facing Jira wiki markup: same content as standard
   - `story.dev.md` — dev-facing CommonMark: opens with the source banner (`inferred` vs `workspace-confirmed`), then full technical detail (file paths, imports, Technical Considerations, technical edge cases, DoD with `npm run` commands)
   - `.storywright-context.json` — resolved session answers: `{"language":"...","persona":"...","naming_pattern":null,"output_folder":"...","resolved_questions":[],"sibling_refs":[]}`
   Emit `story.standard.md` and `story.jira-wiki.md` as fenced code blocks in chat. Do NOT emit `story.dev.md` in chat.
8. Non-blocking assumptions remain? Mark inline with `⚠️ Assumed:`. Do NOT emit clarifications.md.

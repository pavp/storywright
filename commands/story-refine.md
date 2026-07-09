---
description: Audit an existing story and fill gaps in place — or amend it with a forgotten requirement (supports text + optional image companion)
argument-hint: <paste existing story> [+ new requirement to add | + image]
---

Invoke the `story-refine` skill from the storywright pack to audit and improve this story:

$ARGUMENTS

Follow the skill's procedure:

0. Detect companion sources (image). If present, run conflict detection between the story text and the design BEFORE filling sections. Surface conflicts as BLOCKING clarifications; never silently rewrite the story to match the design.
1. Parse the existing story into the section taxonomy. Mark each section: present / missing / weak.
2. Amendment detection (Step R): classify the input as Amendment or Plain refine per the skill's Step R detection rule; on Amendment, follow the Amendment differential (merge, conflict-as-BLOCKING, pre-split re-run on the merged story).
3. Gap-check weak sections via `clarification-questions`. Ask only BLOCKING questions.
4. Detect language and preserve it in output.
5. Fill missing/weak sections via component skills. Preserve original wording where good.
6. Append a "Refinement log" at the end listing what changed. On the Amendment path, additionally note: the amendment marker, a one-line delta summary, conflict status/resolution, and whether the estimate changed.
7. Run INVEST pre-split test (on the merged story, if Step R selected Amendment). If count ≥2, show candidate children + ask via the host's interactive clarification mechanism (e.g. `AskUserQuestion` on Claude Code) with options: "Yes, split" / "Continue without split" / "No, keep as-is". Never auto-split silently.
8. Render two outputs via `story-formatter` to `docs/storywright/YYYY-MM-DD-HHmm-<title-slug>/` (current local time, title kebab-case max 5 words). Use the `Write` tool for all files — never ask:
   - `story.standard.md` — PM-facing CommonMark: observable behavior only, no file paths/imports/component names/CLI commands; DoD uses plain `- ` bullets (no checkboxes); no pipe tables
   - `story.dev.md` — dev-facing CommonMark: full technical detail (file paths, imports, Technical Considerations, technical edge cases, DoD with `npm run` commands and `- [ ]` checkboxes)
   - `.storywright-context.json` — resolved session answers: `{"language":"...","persona":"...","naming_pattern":null,"output_folder":"...","resolved_questions":[],"sibling_refs":[],"extra":{}}`
   Emit `story.standard.md` as a fenced code block in chat. Do NOT emit `story.dev.md` in chat.
9. Non-blocking assumptions remain? Mark inline with `⚠️ Assumed:`. Do NOT emit clarifications.md unless the host has no interactive clarification mechanism.

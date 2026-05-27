---
name: story-refine
description: Audit an existing user story for gaps and fill them in place. Surfaces missing AC, DoD, edge cases, risks; asks clarifications only for blocking unknowns. Returns dual-format refined story.
trigger: "refine this story | improve this story | refinar historia | this story is incomplete"
intent: Refinement skill for stories that already exist but are incomplete or weakly specified. Composes the same component skills as story-generate but skips the drafting step.
version: 1.0.0
inputs:
  - text
outputs:
  - story.jira-wiki.md
  - story.standard.md
  - clarifications.md
composes:
  - _components/clarification-questions
  - _components/acceptance-criteria
  - _components/invest-checklist
  - _components/definition-of-done
  - _components/business-rules
  - _components/edge-cases
  - _components/analytics-events
  - _components/risks-and-dependencies
  - _components/jira-wiki-formatter
---

## Purpose

When the PM already has a story written but it's missing sections, has hand-wavy ACs, or never went through INVEST, this skill brings it up to standard without rewriting it from scratch.

## When to use

- User pastes an existing story (text) and asks to make it Jira-ready.
- A story has ACs but no DoD, or vice versa.
- INVEST gate fails on `Testable` or `Negotiable` — fixable in place (not splittable).

For oversized stories that fail `Independent / Estimable / Small`, hand off to `[[story-split]]` instead.

## Inputs & interpretation

- **text** — existing story. Detect which sections are present, which are missing, which are weak.

## Application (step-by-step)

1. **Parse the existing story.** Map content into the 15-section taxonomy. Note: present / missing / weak.
2. **Gap-check the weak sections** via `[[clarification-questions]]`. If gaps are inferrable, mark `⚠️ Assumed` and proceed. Only ask BLOCKING questions.
3. **Detect language** of the existing story; preserve it in the output.
4. **Fill missing/weak sections** in dependency order:
   - Reglas de negocio → `[[business-rules]]`
   - Consideraciones técnicas → inline
   - Edge cases → `[[edge-cases]]`
   - Criterios de aceptación → `[[acceptance-criteria]]`
   - Analytics → `[[analytics-events]]`
   - Riesgos + dependencias → `[[risks-and-dependencies]]`
   - DoD → `[[definition-of-done]]`
5. **Preserve original wording** where it was already good. Mark changed sections with a comment trail at the end of the story:
   ```
   ---
   Refinement log:
   - Added Edge Cases (8 cases)
   - Strengthened AC-2 (was untestable: "should work properly")
   - Added analytics block
   ```
6. **Run INVEST** via `[[invest-checklist]]`.
   - `READY` → render outputs.
   - `NEEDS REFINEMENT` → iterate on the failing dimension.
   - `SPLIT RECOMMENDED` → STOP. Tell the user the story should go through `[[story-split]]` instead.
7. **Render** both outputs via `[[jira-wiki-formatter]]`.
8. **Emit `clarifications.md`** if assumptions remain unresolved.

## Examples

### Good

Input: a story with title + User Story + 2 vague ACs ("It should be fast", "User can log in").

Output:
- Original title/user story preserved.
- AC-1 rewritten to Given/When/Then with observable outcomes.
- AC-2 split into AC-2 (happy path) and AC-3 (failure path).
- Added Edge Cases section (5 cases).
- Added DoD section.
- Refinement log appended.

### Bad

Rewriting the whole story when only 2 sections were weak. Preserve good content.

## Common Pitfalls

- Treating refine like generate. If the PM already wrote the user goal, don't restate it.
- Renumbering ACs the team may already reference externally. Append new ACs at the end.
- Skipping the refinement log. Reviewers need to see what changed.

## References

- [[story-generate]]
- [[story-split]]
- [[invest-checklist]]

<claude-specific>
- Diff the original sections against the refined ones in your reasoning; only emit changes that materially improve the story.
- Cache the 15-section taxonomy.
</claude-specific>

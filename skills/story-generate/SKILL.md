---
name: story-generate
description: Transform an ambiguous prompt, half-baked story, screenshot, or Figma link into a Jira-ready user story with acceptance criteria, DoD, edge cases, and risks. Ask only critical clarifying questions.
trigger: "/story-generate | generate a user story | write a user story | turn this into a story | crear historia de usuario"
intent: Top-level orchestrator skill that drives the full story generation flow by composing component skills.
version: 1.0.0
inputs:
  - text
  - image
  - figma-link
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

Take whatever the PM has — a one-liner, a half-baked story, a screenshot, a Figma link — and produce a story that an engineer can pick up and ship without follow-up questions. Always output two artifacts (Jira wiki + CommonMark).

## When to use

- The user has a goal but not a story (e.g., "Permitir login con Google").
- The user pastes a vague story and wants it production-ready.
- The user drops an image/Figma link and asks for stories.

## Inputs & how to interpret each

### Text prompts
Anything from a single phrase to a paragraph. If the prompt names only a feature, infer the implicit user goal.

### Local images (PNG/JPG)
Use vision. Extract:
- UI elements (buttons, fields, navigation)
- Visible states (loading, error, success)
- Inferred flow (what does each element trigger?)
- Confidence per inference (high / medium / low). Anything below high → add `> ⚠️ Assumed:` blockquote in the output and surface in clarifications.

### Figma links
If MCP Figma is available (see `[[story-from-figma]]`), use it to enumerate frames, components, navigation. If not, fall back to asking the user to drop screenshots.

### Mixed inputs (text + image + Figma)

The skill is designed to **fuse multiple sources** in a single invocation. Common pairings:

- **Text + screenshot** — text states the goal, image shows the proposed UI. Use text for `User Story / Goal / Scope`, image for `Components / States / Edge cases / UX flow`.
- **Text + Figma link** — text gives intent, Figma gives implementation surface. Use text for `User Story / Business goal`, Figma for `Technical considerations / Edge cases / Components / Multi-screen flows`.
- **Text + image + Figma** — full triangulation. Highest fidelity; also highest chance of conflict.

**Source priority (when sources disagree):**

| Section | Primary | Secondary | Tertiary |
|---|---|---|---|
| User Story / Goal | Text | Figma (frame titles, callouts) | Image |
| Business Rules / Scope | Text | Figma | Image |
| UI Components / States | Figma | Image | Text |
| Edge Cases | Figma + Image (states shown) | Text | — |
| Technical Considerations | Figma (component naming, design system refs) | Text | Image |
| Acceptance Criteria | Triangulate all three | — | — |

**Conflict handling:**

1. **Detect the conflict explicitly.** Example: text says "Google only" but Figma shows Google + Facebook buttons.
2. **Do NOT silently pick a winner.** Surface the conflict in `clarifications.md` as a BLOCKING question: *"Text says X but design shows Y — which is canonical?"*
3. **If the user is in-session, ask immediately** before drafting. If running batch, mark the story `DRAFT` and write both options in scope/out-of-scope with `> ⚠️ Conflict:` annotation.
4. **Scope coverage check:** if Figma shows N flows but text describes 1, ask whether to (a) generate 1 story bounded to text, (b) generate N stories from Figma, or (c) generate 1 story + flag remaining flows as roadmap.

## Application (step-by-step)

1. **Detect input types present** — text, image, figma-link, or any combination. Branch accordingly:
   - **Single source** → process as before.
   - **Mixed sources** → run the "Mixed inputs" protocol above, including source-priority lookup and explicit conflict detection BEFORE drafting.
2. **Intake gap check** — invoke `[[clarification-questions]]`. If it returns BLOCKING questions, **ask first** before drafting.
3. **Detect language** of input (es | en | other). Output in the input language.
4. **Draft skeleton** of the structured story (all 15 sections from the template).
5. **Fill the CORE first** (always required, in order):
   1. **Title** — concise, ≤8 words.
   2. **Summary** — single value-focused sentence ("Enable Google login for trial users to reduce signup friction"), NOT a feature label ("Add Google button"). Elevator pitch.
   3. **User Story** (As a / I want to / so that).
      - **Persona check:** if role is "user" or "customer", push for sharper ("trial user", "Workspace admin"). Generic personas hide motivation.
      - **"So that" check:** outcome must be distinct from action. "So I can save my work" = restating; "So I don't lose progress if tab crashes" = real motivation.
   4. **Acceptance Criteria** via `[[acceptance-criteria]]` — at minimum the happy path + one failure mode.
   5. **Definition of Done** via `[[definition-of-done]]`.

6. **Fill OPTIONAL sections only if they have real content.** Drop any that would be empty or boilerplate:
   - Contexto / Business goal — include when there's a stated trigger or KPI
   - Scope / Out of scope — include when boundaries are non-obvious
   - `[[business-rules]]` — include when invariants exist beyond the ACs
   - Technical considerations — include when surface/SDK/flag matters
   - `[[edge-cases]]` — include when ≥3 high-impact edges exist
   - `[[analytics-events]]` — include when story has measurable funnel
   - `[[risks-and-dependencies]]` — include when there are real blockers or unknowns

   The bias is **less is more**. A clean 4-section story beats a 15-section one full of `N/A`.
6. **Run INVEST self-check** via `[[invest-checklist]]`:
   - `READY` → continue.
   - `NOT A STORY` (V failed) → STOP. Tell the user this is a tech task, not a user story. Suggest reframing or combining with user-facing work.
   - `NEEDS REFINEMENT` (T or N failed) → revise the failing sections in place.
   - `RUN A SPIKE` (E failed on unknowns) → recommend a 1–2 day investigation; do not split or generate yet.
   - `SPLIT RECOMMENDED` (I, E, or S failed) → STOP. Hand off to `[[story-split]]`. **Never auto-split.**
7. **Render outputs** via `[[jira-wiki-formatter]]`:
   - `story.jira-wiki.md` — Jira wiki markup
   - `story.standard.md` — CommonMark
8. **If clarifications remain unresolved** (user skipped them, or low-confidence visual inferences exist):
   - Emit `clarifications.md` with the outstanding questions
   - Mark the story output with a `DRAFT` banner at the top
   - Tell the user explicitly what would unblock promoting from DRAFT to READY
9. **Present both artifacts** as fenced code blocks. Ask the user whether to save to disk (offer paths under `./stories/<slug>/`).

## Examples

### Good — text prompt
Input: *"Permitir login con Google"*

Flow:
1. Run gap check → 3 BLOCKING questions: scope of accounts, account linking, surface (web/mobile/both).
2. Ask the 3 questions, wait for answers.
3. Draft + fill all 15 sections.
4. INVEST → `READY`.
5. Render both outputs.
6. Done.

### Good — image input
Input: screenshot of a dashboard with a filter sidebar.

Flow:
1. Vision: extract filter categories, infer apply/reset actions.
2. Confidence on "filters persist across navigation" → MEDIUM → mark as `⚠️ Assumed` and surface in clarifications.
3. Run gap check → 1 BLOCKING (does this replace or augment current filters?).
4. Ask, draft, fill, INVEST, render.

### Bad

Input: *"Build the new dashboard"*

Don't draft. The scope is too broad. Run gap check → propose splitting into smaller stories at the **clarification step**, before the story is drafted. (Effectively delegates to `[[story-split]]` upfront.)

## Common Pitfalls

- Drafting before asking the critical questions. Always run intake first.
- Ignoring confidence in image inferences. If you guessed, say so.
- Auto-splitting. Never. Propose, wait, then split.
- Mixing English and Spanish in the output. Pick the input language.
- Skipping the `clarifications.md` file when assumptions remain.

## References

- [[story-refine]] (use when input is an existing story to improve)
- [[story-split]] (use when INVEST fails on Independent/Estimable/Small)
- [[story-from-figma]] (use when input is a Figma link)
- [[clarification-questions]]

## Output templates

See `templates/story.jira-wiki.md` and `templates/story.standard.md` in this skill's folder for the canonical section ordering and formatting.

<claude-specific>
- Use extended thinking for INVEST check and for vision confidence scoring.
- Cache the 15-section taxonomy and component invocation order across calls.
- When input includes images, attach them to the same message as the prompt to use Claude's native vision (do not describe-then-reason in two steps).
- Use prompt caching on the component skill bodies (they're long and reused).
</claude-specific>

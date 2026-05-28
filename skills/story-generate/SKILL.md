---
name: story-generate
description: Transform an ambiguous prompt, half-baked story, screenshot, or Figma link into a Cohn+Gherkin user story. Inherits all hard rules from storywright-base.
trigger: "/story-generate | generate a user story | write a user story | turn this into a story | crear historia de usuario"
intent: Top-level orchestrator that drafts a fresh story from any input. Behavior 100% identical to siblings except for source (raw / ambiguous input) and split-behavior (recommend /story-split when pre-split count ≥2).
version: 2.3.0
inputs:
  - text
  - image
  - figma-link
outputs:
  - story.standard.md
  - story.jira-wiki.md
  - story.dev.md
  - .storywright-context.json
composes:
  - _components/storywright-base
  - _components/clarification-questions
  - _components/acceptance-criteria
  - _components/invest-checklist
  - _components/jira-wiki-formatter
---

## Purpose

Take whatever the PM has — a one-liner, a half-baked story, a screenshot, a Figma link — and produce a Cohn+Gherkin story an engineer can pick up and ship without follow-up questions.

**All hard rules, canonical output shape, language detection, mechanical pre-split test, context persistence, terminal-only Q, and INVEST handling live in `[[storywright-base]]`. Read that first. Anything in this file is a SOURCE-SPECIFIC or SPLIT-BEHAVIOR delta only.**

## Source-specific differential

- **Source:** raw / ambiguous text, optionally fused with screenshot and/or Figma URL.
- **What changes vs base:** at intake the prompt may name only a feature; infer the implicit user goal via rule 3 (persona sharpening) + rule G (passive-goal check) of the base. Mixed inputs follow the base conflict-detection rule plus the source-priority table below.

### Mixed-input source priority (text + image + Figma)

| Section | Primary | Secondary | Tertiary |
|---|---|---|---|
| User Story / Goal | Text | Figma frame titles | Image |
| Scope | Text | Figma | Image |
| UI Components / States | Figma | Image | Text |
| AC observable outcomes | Triangulate | — | — |

Conflicts → BLOCKING `AskUserQuestion` per base rule 1.

## Split behavior differential

If the base **deterministic pre-split test** returns count ≥2:
- **STOP drafting.**
- Output a terminal message listing candidate children + per-pair dep notes (base rule 10) + V audit (base rule 11).
- Show candidate children + dep notes + V audit.
- Ask via `AskUserQuestion`: "This story has [N] independent flows. Run split now?" with options:
  - "Yes, split" → execute `[[story-split]]` inline (epic + children + .storywright-context.json).
  - "Continue without split" → proceed with single-story path (fill canonical block → INVEST → render dual outputs).
  - "No, keep as-is" → stop. No output written.
- Do NOT silently auto-split without the AskUserQuestion confirmation.

If count ≤1:
- Proceed with the base step-by-step Application skeleton (read context → language → persona → passive-goal → gap-check → siblings → fill canonical block → INVEST → render).

## Application (step-by-step)

Follow the **base Application** skeleton exactly. The only override is step 7's split branch (above): on count ≥2, route to `/story-split` recommendation instead of host-side recursion.

## Examples

### Good — text prompt
Input: *"Permitir login con Google"*
- Language auto-detect → ES.
- Persona sharpening → ask: trial user? admin? signed-out visitor?
- Pre-split count = 1 (one auth flow). Continue.
- Draft canonical block; INVEST → READY. Render.

### Good — broad input routed to split
Input: *"Build the new dashboard"*
- Pre-split count ≥2 → STOP. Terminal message: candidate children + dep notes + V audit + "Run `/story-split`".
- No drafted story written.

### Good — passive goal fires
Input: *"As a user, I want to view list of customers, so that I find details."*
- Rule G fires. Ask: "What does the user do with the customer they find?"
- User: "Call them." → so-that strengthened.

### Bad
Writing any sidecar question file (violates base rule 1).

### Bad
Drafting a 15-section story when pre-split count ≥2 (violates split behavior differential).

## References

- [[storywright-base]] — the rulebook
- [[story-refine]] (when input is an existing story)
- [[story-split]] (when count ≥2)
- [[story-from-figma]] (when input is Figma URL)

<claude-specific>
- Read `[[storywright-base]]` before applying. Do not duplicate its rules in your reasoning.
- For mixed inputs, attach images in the same message for native vision.
- Use extended thinking for INVEST and pre-split counting.
</claude-specific>

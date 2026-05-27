---
name: clarification-questions
description: Surface only the critical questions blocking a complete user story. Ask the minimum needed; never quiz the user. Used by every top-level story skill.
trigger: "internal use by story-* skills"
intent: Component skill that runs a gap analysis on an input and emits ordered, high-leverage clarifying questions. Asks zero questions when the input is already complete.
version: 1.0.0
inputs:
  - text
  - image
  - figma-context
outputs:
  - clarifying-questions-block
---

## Purpose

Turn vague inputs into a short, prioritized question list. The goal is **minimal friction**: ask only what blocks writing a usable story. Many prompts are answerable with reasonable assumptions — favor making the assumption (and marking it) over asking.

## When to use

Invoked by `story-generate`, `story-refine`, `story-split`, and `story-from-figma` after intake.

## Inputs & interpretation

- **text** — raw prompt, half-baked story, or paragraph
- **image** — Claude vision interprets a screenshot/mockup; pass the inferred description
- **figma-context** — frame names, navigation hints, components, states

## Application (step-by-step)

1. Run a gap check across these axes:
   - **Who** (user/persona)
   - **What outcome** (business value)
   - **Trigger / entry point**
   - **Success state**
   - **Failure / error states**
   - **Data inputs** (auth scope, identifiers, format)
   - **Constraints** (platform, accessibility, locale, SLA)
   - **Out-of-scope assumptions**
   - **Multi-source conflicts** (when text + image + Figma are all provided): explicit disagreement between sources MUST be surfaced. Examples: text says "Google only" but Figma shows multiple providers; text mentions 1 flow but Figma shows 3; image shows error state not mentioned in text. Never silently pick a winner.
2. For each axis, mark one of: ANSWERED · INFERRABLE · BLOCKING.
3. Drop `ANSWERED`. For `INFERRABLE`, do NOT ask — mark assumption in the story output with `> ⚠️ Assumed:`.
4. For `BLOCKING`, draft questions. Limit to **3 questions max per round**. Prefer multiple-choice or yes/no.
5. Order by impact: scope > behavior > data > UX detail.
6. Emit as a Markdown block titled `### Clarifying Questions` with numbered list.
7. If no questions remain, emit nothing.

## Examples

### Good

Input: *"Permitir login con Google"*

```
### Clarifying Questions
1. **Scope of accounts** — debe aceptar cualquier cuenta Google, solo Workspace del dominio X, o ambos?
2. **Account linking** — qué pasa si el email ya existe con login email/password? merge automático, error, o pantalla de claim?
3. **Mobile vs web** — el flujo cubre solo web ahora, o también mobile en este ticket?
```

### Bad

Asking 8 questions including UX color, button copy, and analytics naming. That's pollution — most are inferrable or trivially defaultable.

## Common Pitfalls

- Asking instead of inferring. If a sensible default exists, take it and mark `⚠️ Assumed`.
- Stacking questions in one bullet. One ask per bullet.
- Open-ended questions ("¿qué te parece…?"). Make them concrete and answerable in <1 sentence.
- More than 3 questions per round. Iteration is fine; interrogation is not.

## References

- [[story-generate]]
- [[story-refine]]
- [[clarification-questions-output-format]] (in story-generate templates)

<claude-specific>
Use a structured-thinking pass to enumerate the 8 axes before deciding which are BLOCKING. Cache the axes list across invocations within the same session.
</claude-specific>

# Multimodal Guide

`storywright` supports two input modes. The skills only describe **how to extract requirements** from each modality — the host agent (Claude Code, Cursor, Copilot, Codex CLI, or any SKILL.md-compatible tool) supplies the actual capabilities.

## Text

Plain prompts. Always available on every host. Skills detect ambiguity and ask up to 3 BLOCKING clarifications.

## Images (PNG/JPG)

Drop the image into the chat alongside the prompt:

```
generate a user story from this mockup:
<attach mockup.png>
```

When the host has native vision, the `story-generate` skill instructs the agent to:

1. Enumerate visible UI elements (forms, buttons, lists, navigation, headers).
2. Identify visible states (empty, loading, error, success).
3. Infer flows from layout cues (CTAs, breadcrumbs, modals).
4. Score per-inference confidence: **HIGH** (visible in design), **MEDIUM** (implied), **LOW** (assumed).
5. Surface MEDIUM/LOW inferences in the clarifications and mark them `> ⚠️ Assumed:` in the story.

## Confidence policy

| Confidence | What happens |
|---|---|
| HIGH | Used as fact in the story; no marker |
| MEDIUM | Used as fact but marked `> ⚠️ Assumed:` in the section |
| LOW | Surfaced as a clarifying question; story marked `DRAFT` until resolved |

## Degrade path — host without vision

Not every host can see images. Text-only agents (some Codex CLI configurations, non-vision models) receive the attachment but cannot interpret it. In that case the skill does **not** silently drop the image or invent its contents. It degrades to text-only:

1. Ask the user — via the host's interactive clarification mechanism (or the `clarifications.md` fallback) — to describe the mockup's elements, states, and flows in words.
2. Treat every element derived from that description as **LOW** confidence: mark it `> ⚠️ Assumed:` in the story body.
3. Keep the story marked `DRAFT` until the user confirms the described elements.

The rule: **an unreadable image degrades to a text clarification, never to a fabricated inference.** This preserves the project-less contract — the story stays a forward contract the user validates, not a guess the agent asserts.

## Limits and known failure modes

- Vision misreads small UI labels — verify text-heavy mockups in HIGH-DPI.
- Empty/error/loading states are often missing from designs — the skill asks about them explicitly.
- A host without vision cannot self-report that limit reliably — if image-derived detail looks thin, assume the degrade path fired and confirm the elements with the user.

# Multimodal Guide

`storywright` supports two input modes. The runtime is Claude Code; the skills only describe **how to extract requirements** from each modality.

## Text

Plain prompts. Always available. Skills detect ambiguity and ask up to 3 BLOCKING clarifications.

## Images (PNG/JPG)

Drop the image into the chat alongside the prompt:

```
generate a user story from this mockup:
<attach mockup.png>
```

Claude uses native vision. The `story-generate` skill instructs Claude to:

1. Enumerate visible UI elements (forms, buttons, lists, navigation, headers).
2. Identify visible states (empty, loading, error, success).
3. Infer flows from layout cues (CTAs, breadcrumbs, modals).
4. Score per-inference confidence: **HIGH** (visible in design), **MEDIUM** (implied), **LOW** (assumed).
5. Surface MEDIUM/LOW inferences in `clarifications.md` and mark them `> ⚠️ Assumed:` in the story.

## Confidence policy

| Confidence | What happens |
|---|---|
| HIGH | Used as fact in the story; no marker |
| MEDIUM | Used as fact but marked `> ⚠️ Assumed:` in the section |
| LOW | Surfaced as a clarifying question; story marked `DRAFT` until resolved |

## Limits and known failure modes

- Vision misreads small UI labels — verify text-heavy mockups in HIGH-DPI.
- Empty/error/loading states are often missing from designs — the skill asks about them explicitly.

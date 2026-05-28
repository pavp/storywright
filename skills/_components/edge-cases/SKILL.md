---
name: edge-cases
description: Enumerate edge cases for a story. Covers boundary, concurrency, network, data, permission, and UX-state failures. Returns only the edge-cases block.
trigger: "internal use by story-* skills"
intent: Component skill that systematically generates edge cases across known failure axes so acceptance criteria can cover them.
version: 2.0.0
inputs:
  - story-context
outputs:
  - edge-cases-block (dev.md only)
---

## Purpose

Edge cases are how engineers find latent risk. Generate them **before** acceptance criteria so each one pairs to an AC.

## When to use

**Dev-file only.** Invoked while rendering `story.dev.md` (the dev-facing file), never the PM-facing `story.standard.md` / `story.jira-wiki.md`. `[[storywright-base]]` rule 3 forbids an Edge Cases section in the PM story body — this output lands exclusively in `story.dev.md`. It still informs AC failure paths (`[[acceptance-criteria]]`): the AC covers the observable behavior in the PM files; the enumerated technical edge detail lives in dev.md.

## Inputs & interpretation

- **story-context** — surface, primary flow, data shape

## Application (step-by-step)

Walk these axes and pick the ones that apply:

1. **Boundary** — empty input, single item, max length, max collection size
2. **Network** — offline, timeout, slow connection, intermittent
3. **Concurrency** — two devices simultaneously, race conditions, stale state
4. **Permission** — unauthenticated, expired session, insufficient role, revoked access
5. **Data integrity** — duplicate, conflicting, corrupted, partial
6. **State** — already in target state, transition from unexpected source state
7. **External** — third-party down, rate limit hit, response shape change
8. **UX** — back/forward navigation mid-flow, deep-link entry, modal interrupt, accessibility tooling

For each applicable axis, write 1–2 concrete cases. Keep each ≤1 sentence.

Emit under `### Edge Cases` **inside `story.dev.md`** (never the PM files):

```
### Edge Cases
- **Network — timeout during OAuth callback**: user sees a retry prompt; no orphan session created.
- **Concurrency — same Google account in two tabs**: second tab inherits the same session.
- **Permission — Workspace domain not allowed**: error toast with admin contact.
- **State — already logged in with email/password**: route through account-linking flow.
- **UX — back button during consent**: returns to login screen, no partial state.
```

## Examples

### Good

See above — concrete, observable, mappable to ACs.

### Bad

`- Lots of weird stuff might happen.` (no axis, no observable outcome)

## Common Pitfalls

- Listing "what if user does something dumb" — not actionable. Tie to an axis.
- Over-enumerating. 5–10 edge cases is healthier than 30. Pick the high-impact ones.
- Forgetting non-functional edges (offline, slow network).

## References

- [[acceptance-criteria]]
- [[risks-and-dependencies]]

<claude-specific>
Cache the 8 axes. Use extended thinking when surface is novel.
</claude-specific>

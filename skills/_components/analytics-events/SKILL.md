---
name: analytics-events
description: Propose analytics/event tracking for a story. Names events, payloads, and trigger points. Returns only the analytics block, ready for ProductOps to map.
trigger: "internal use by story-* skills"
intent: Component skill that drafts a small, opinionated set of analytics events using a consistent naming convention.
version: 2.0.0
inputs:
  - story-context
  - acceptance-criteria
outputs:
  - analytics-events-block (dev.md only)
---

## Purpose

Stories without analytics are stories without feedback. Propose the minimum set of events to measure adoption, funnel, and failure rate of the new behavior.

## When to use

**Dev-file only.** Invoked while rendering `story.dev.md`, after acceptance criteria are drafted; events align to observable AC outcomes. Event names, payloads, and PII boundaries are technical detail — they belong in `story.dev.md`, never the PM-facing files (`[[storywright-base]]` rule 3).

## Inputs & interpretation

- **story-context** — feature surface, user role
- **acceptance-criteria** — each happy-path AC suggests one funnel step

## Application (step-by-step)

1. Identify the funnel: entry → action → success / failure outcomes.
2. For each step, define one event using `feature_action_state` snake_case naming:
   - `login_google_started`
   - `login_google_consent_granted`
   - `login_google_completed`
   - `login_google_failed`
3. For each event, define payload fields. Always include:
   - `user_id` (when known)
   - `surface` (web | mobile-ios | mobile-android)
   - `correlation_id` (links events of one attempt)
   - `error_code` (only on failure events)
4. Mark each event:
   - `📊 product` — feeds dashboards / funnels
   - `🔧 ops` — feeds error monitoring
   - `💰 revenue` — feeds growth metrics
5. Note retention/PII boundaries explicitly when sensitive (e.g., emails hashed).
6. Emit under `### Analytics / Eventos` **inside `story.dev.md`**.

Example block:

```
### Analytics / Eventos
| Event | Trigger | Payload | Tag |
|---|---|---|---|
| `login_google_started` | tap "Continue with Google" | `surface`, `correlation_id` | 📊 |
| `login_google_completed` | session created | `user_id`, `surface`, `correlation_id` | 📊 |
| `login_google_failed` | error in callback | `surface`, `correlation_id`, `error_code` | 🔧 |
| `account_link_prompted` | linking screen shown | `user_id`, `surface` | 📊 |

> PII: email hashes only. No raw emails in event payload.
```

## Examples

### Good

See above — minimal funnel, clear taxonomy, PII note included.

### Bad

```
- Track login button click.
- Track error.
```

(no payload, no taxonomy, no PII boundary)

## Common Pitfalls

- Over-instrumenting (12 events per story). Aim for ≤6.
- Inconsistent naming (`googleLogin`, `g_login`, `loginGoogle` in same story).
- Forgetting `correlation_id` — without it you cannot join events into a funnel.
- Putting raw PII in payloads.

## References

- [[acceptance-criteria]]
- [[definition-of-done]]

<claude-specific>
Cache the 4 required payload fields and the 3 tag emojis.
</claude-specific>

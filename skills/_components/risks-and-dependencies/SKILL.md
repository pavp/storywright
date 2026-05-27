---
name: risks-and-dependencies
description: Surface technical, product, and organizational risks plus blocking dependencies for a story. Each item has owner, likelihood, mitigation. Returns only the risks+deps block.
trigger: "internal use by story-* skills"
intent: Component skill that turns hidden assumptions into tracked risks and dependencies so PMs and tech leads can act on them.
version: 1.0.0
inputs:
  - story-context
  - business-rules
  - technical-considerations
outputs:
  - risks-and-dependencies-block
---

## Purpose

Risks and dependencies that aren't written down end up as outages or missed launches. Make them visible at story time.

## When to use

Late in `story-generate`, after business rules and technical considerations are drafted — those inform what's risky.

## Inputs & interpretation

- **story-context** — surface, novelty
- **business-rules** — compliance/policy items often imply risks
- **technical-considerations** — new SDKs, new infra, new patterns imply risk

## Application (step-by-step)

1. Enumerate **dependencies** (blocking other work):
   - Other stories / teams
   - External APIs (auth providers, payment, analytics)
   - Infra changes (new env var, new DB column)
   - Designs / copy / legal sign-off
2. For each dependency: `<what> · owner · status (READY / IN-PROGRESS / NOT-STARTED) · blocking?`
3. Enumerate **risks** across 4 categories:
   - **Technical** (latency, scale, integration brittleness)
   - **Product** (adoption assumption, UX confusion)
   - **Security / privacy** (PII exposure, attack surface)
   - **Operational** (oncall toil, monitoring gap)
4. For each risk: `<risk> · likelihood (L/M/H) · impact (L/M/H) · mitigation`
5. If a risk is high-impact AND high-likelihood, flag it `🚨` so it gets attention in review.
6. Emit under two subheadings: `### Dependencias` and `### Riesgos` (or English).

Example:

```
### Dependencias
| Dependencia | Owner | Estado | Bloquea? |
|---|---|---|---|
| Google OAuth credentials in staging | Platform team | READY | No |
| Account-linking design (final) | Design — @maria | IN-PROGRESS | Sí |
| Legal review of consent copy | Legal — @sam | NOT-STARTED | Sí |

### Riesgos
| Riesgo | Likelihood | Impact | Mitigación |
|---|---|---|---|
| 🚨 Account-linking edge cases not fully scoped | H | H | Spike before pickup; document edge matrix |
| Workspace domain restriction config drift | M | M | Read domain list from config service, not env var |
| OAuth callback latency on slow networks | M | L | Add timeout + retry; pre-existing pattern from sign-up |
```

## Examples

### Good

See above — owners named, statuses observable, mitigations actionable.

### Bad

`- Could be risky.` (no axis, no owner, no mitigation)

## Common Pitfalls

- Listing "the user might not like it" as a risk. Tie to a measurable adoption signal.
- Owners as "the team". Assign a person or named role.
- Mitigations as "be careful". Mitigations are actions.

## References

- [[business-rules]]
- [[invest-checklist]] (Independent check often surfaces dependencies)

<claude-specific>
Use extended thinking. Risks cluster — surfacing one often reveals others in the same category.
</claude-specific>

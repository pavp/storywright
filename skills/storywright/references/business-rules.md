## Purpose

Business rules are **policy invariants** the story must respect. They survive across stories; they bound the design space.

## When to use

After the story body is drafted, before ACs are finalized — so ACs can reference relevant rules. Business Rules are an **optional PM section** (see `references/story-formatter.md` — emit in `story.standard.md` only when non-empty) AND are also rendered in `story.dev.md`. They are policy invariants, not technical detail, so unlike edge-cases they are not dev-only.

## Inputs & interpretation

- **story-context** — domain (auth, billing, content, etc.)
- **domain-hints** — explicit references in the prompt to limits, eligibility, permissions

## Application (step-by-step)

1. Enumerate candidate rules across these categories:
   - **Eligibility** (who can perform the action)
   - **Limits** (rate, quota, size, duration)
   - **Permissions / roles**
   - **Data validity** (format, ranges, required combinations)
   - **Compliance** (GDPR, PCI, accessibility legal floor)
   - **Lifecycle** (creation, expiration, deletion rules)
2. For each candidate, write as an imperative statement: `Only X can Y`, `Y must be Z`, `Y expires after N`.
3. Drop rules already implied by Acceptance Criteria — rules state the *why* AC exist.
4. Mark unresolved rules with `> ⚠️ Confirm:` and bubble them up to `references/clarification-questions.md`.
5. Emit as numbered list under `### Reglas de Negocio` (or English equivalent based on input language).

## Examples

### Good

```
### Reglas de Negocio
1. Solo usuarios con cuentas Google verificadas pueden usar el login social.
2. El email del IdP debe coincidir con un dominio permitido si la cuenta es Workspace.
3. La sesión expira tras 30 días de inactividad.
4. Un usuario no puede tener simultáneamente login social y password sin haber pasado por flujo de account-linking.
> ⚠️ Confirm: ¿Se permite descrear el vínculo Google una vez establecido?
```

### Bad

```
- Login should be secure.
- Users should be happy.
```

(not invariants, not actionable)

## Common Pitfalls

- Conflating rules with ACs. AC = testable on this story. Rule = always true.
- Stating implementation ("use OAuth 2.0 with PKCE"). That belongs in technical considerations.
- Inventing rules. If you can't source the rule, mark it `⚠️ Confirm:`.

## References

- `references/acceptance-criteria.md`
- `references/clarification-questions.md`
- `references/risks-and-dependencies.md`

<claude-specific>
Cache the 6 category list. Use extended thinking when domain is high-stakes (auth, payments, PII).
</claude-specific>

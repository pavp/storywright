## Purpose

Generate ACs that are **independently testable** and map directly to QA cases. Use Given/When/Then phrasing. Include negative cases. Pair with `references/edge-cases.md` so each edge case has at least one matching AC.

## When to use

Invoked by the generate and refine intents after the body of the story is drafted.

## Inputs & interpretation

- **story-context** — title, user role, expected behavior summary
- **edge-cases-block** — list of edge cases that must each be covered

## Application (step-by-step)

1. Start with the happy path: one AC for the primary success scenario.
2. Add one AC per failure mode (auth failure, network error, validation error, permission denied).
3. Add one AC per explicit edge case from `references/edge-cases.md`.
4. Add one negative AC: "When [precondition not met], Then [no-op or error UX]."
5. Each AC follows the pattern:
   ```
   **AC-N: <short title>**
   - Given <precondition>
   - When <action>
   - Then <observable outcome>
   - And <secondary observable outcome>  (optional)
   ```
6. Number ACs `AC-1`, `AC-2`, …. This is the ONLY allowed scheme, in every language — never `CA-01`, `Criterio 1`, `Escenario 1`, or any localized variant. The `AC` label is fixed; translate only the scenario title after it. Stable numbering — never renumber when adding new ones in iterations.
7. Emit only the AC block. Do NOT include explanations, a section heading above the ACs, or surrounding prose. The host renderer (`references/story-formatter.md`) owns the `## Acceptance Criteria` heading.

## Examples

### Good

```
**AC-1: Successful Google login**
- Given the user is on the login screen
- When they tap "Continue with Google" and authorize a valid account
- Then they are redirected to the dashboard within 3 seconds

**AC-2: Account linking — same email exists with password**
- Given an account with email user@x.com already exists with email/password
- When the user logs in with Google using user@x.com
- Then a "Link your account" confirmation screen is shown
- And the user must enter their existing password to merge

**AC-3: Cancellation in OAuth consent**
- Given the user has tapped "Continue with Google"
- When they cancel the Google consent screen
- Then they are returned to the login screen with no error toast
```

### Bad

```
- It should work with Google
- Handle errors properly
- The user can log in
```

(no preconditions, no observables, untestable)

## Splitting signal

**Multiple When/Then pairs in one AC ⇒ story needs splitting.** Each `When` and each `Then` should be singular. If you find yourself writing AC-1 with three `When`s, that's not a story with rich ACs — it's three stories collapsed into one. Stop and switch to the split intent.

Multiple `Given`s are fine — preconditions stack.

## Common Pitfalls

- Vague verbs (`work properly`, `handle correctly`, `improved performance`, `faster`). Use observable, measurable outcomes ("loads in <2s", "success toast shown").
- Compound ACs (multiple `When`s or `Then`s). Split.
- "So that" restates "I want to" — the value statement disappears. Dig until you find the real motivation ("so I don't lose work if the tab crashes" — not "so I can save").
- Technical tasks disguised as stories ("As a developer, I want to refactor X"). If there's no observable user outcome, it's an eng task, not a story.
- Forgetting non-goals — write at least one "Then it does NOT…" or mark as scope boundary.
- Renumbering when adding ACs mid-iteration. Append, never renumber.

## References

- `references/edge-cases.md`
- `references/definition-of-done.md`
- `references/business-rules.md`

<claude-specific>
Use extended thinking to enumerate failure modes before drafting. Cache the Given/When/Then template.
</claude-specific>

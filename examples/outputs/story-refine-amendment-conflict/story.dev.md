# Guest checkout — Dev Notes

> Developer supplement to `story.standard.md`. Holds all technical detail stripped from the PM-facing files (rule 3a).

## Technical Considerations
- Checkout flow branches on session state at the `POST /checkout/session` call — signed-in requests carry a session token, guest requests omit it and skip the saved-address/payment lookup.
- Guest orders are linked to the shopper by email + order ID only, no account record created implicitly.
- Signed-in pre-fill reads the existing `GET /account/checkout-defaults` endpoint — unchanged by this amendment.

## Edge Cases
- **Data — guest re-enters an email that already has an account:** do not silently merge into the existing account; complete the guest order and surface a "create an account?" prompt post-purchase.
- **Network — payment authorization times out mid-checkout (guest path):** show a retry prompt; do not create a duplicate order on retry.
- **State — signed-in shopper's saved payment method is expired:** fall back to manual entry instead of blocking checkout.

## Analytics / Eventos
| Event | Trigger | Payload | Tag |
|---|---|---|---|
| `checkout_completed` | order is placed | `is_guest`, `surface`, `correlation_id` | 📊 |
| `checkout_guest_started` | guest proceeds past cart without signing in | `surface`, `correlation_id` | 📊 |

> PII: no shopper email/payment detail in the payload — only flags and correlation IDs.

## Dependencias
| Dependencia | Owner | Estado | Bloquea? |
|---|---|---|---|
| Guest-order linkage (email + order ID, no implicit account) | Backend team | READY | No |

## Definition of Done (full)
- [ ] Code merged to main
- [ ] All ACs pass in QA, including the guest checkout scenario
- [ ] Unit tests added; coverage does not decrease
- [ ] E2E covers guest checkout happy path + signed-in pre-fill happy path (`npm run test:e2e -- checkout`)
- [ ] `npm run lint` and `npm run test` clean
- [ ] Accessibility: keyboard-navigable, screen-reader labels, contrast ≥ WCAG AA
- [ ] Analytics events implemented and verified in dashboard
- [ ] No regressions in the critical-path E2E suite

## Estimate

**Story Points: 2** (Fibonacci)

| Signal | Value | Weight | Contribution |
|--------|-------|--------|--------------|
| Acceptance Criteria | 2 | ×1.0 | 2.0 |
| Edge Cases | 3 | ×0.6 | 1.8 |
| Dependencies | 1 | ×1.5 | 1.5 |
| High-severity Risks 🚨 | 0 | ×2.0 | 0.0 |
| Business Rules | 0 | ×0.5 | 0.0 |
| **Raw score** | | | **5.3** → bucket 5 |
| LLM adjustment | | | −3 → 2: conflict resolution replaced an implicit constraint (authenticated-only) with an already-scoped alternative (guest path); no new integration surface beyond the existing checkout endpoint |

> Planning note: story points reflect relative complexity, not time, commitment, or velocity. Use them to compare stories against the calibration anchors in `[[estimation]]` — not to forecast hours.

---

*Refinement log*
- INVEST Verdict: READY
- Amendment: delta "guests can also check out" contradicted AC-1's original authenticated-only Given.
- Conflict: BLOCKING AskUserQuestion raised; resolved as "guests allowed, supersedes the authenticated-only precondition" — AC-1 Given updated in place; AC-2 unchanged.

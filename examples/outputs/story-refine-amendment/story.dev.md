# Customer search — Dev Notes

> Developer supplement to `story.standard.md`. Holds all technical detail stripped from the PM-facing files (rule 3a).

## Technical Considerations
- Search endpoint `GET /support/customers/search?q=<term>` matches on name and email with a debounced client-side query.
- The endpoint's existing response envelope already carries a `total` field alongside the result page — the match-count display reads that field, no new endpoint or query needed.

## Edge Cases
- **Network — search request times out:** show a retry prompt; do not clear the last successful result set.
- **Data — customer record is soft-deleted:** exclude from search results; do not surface a broken link.
- **UX — search term contains only whitespace:** treat as an empty query; do not submit a request.
- **UX — match count is exactly 1:** use singular copy ("1 match") instead of "1 matches".

## Analytics / Eventos
| Event | Trigger | Payload | Tag |
|---|---|---|---|
| `support_search_submitted` | agent submits a search | `surface`, `correlation_id` | 📊 |
| `support_search_failed` | search request errors | `surface`, `correlation_id`, `error_code` | 🔧 |

> PII: no customer name/email in the payload — only counts and correlation IDs.

## Definition of Done (full)
- [ ] Code merged to main
- [ ] All ACs pass in QA, including the match-count display
- [ ] Unit tests added; coverage does not decrease
- [ ] E2E covers search happy path + match-count display (`npm run test:e2e -- support-search`)
- [ ] `npm run lint` and `npm run test` clean
- [ ] Accessibility: keyboard-navigable, screen-reader labels, contrast ≥ WCAG AA
- [ ] Analytics events implemented and verified in dashboard
- [ ] No regressions in the critical-path E2E suite

## Estimate

**Story Points: 2** (Fibonacci)

| Signal | Value | Weight | Contribution |
|--------|-------|--------|--------------|
| Acceptance Criteria | 3 | ×1.0 | 3.0 |
| Edge Cases | 4 | ×0.6 | 2.4 |
| Dependencies | 0 | ×1.5 | 0.0 |
| High-severity Risks 🚨 | 0 | ×2.0 | 0.0 |
| Business Rules | 0 | ×0.5 | 0.0 |
| **Raw score** | | | **5.4** → bucket 3 |
| LLM adjustment | | | −1 → 2: edge case "match count is exactly 1" — the only new-signal edge case is a copy/pluralization branch, not new integration surface |

> Planning note: story points reflect relative complexity, not time, commitment, or velocity. Use them to compare stories against the calibration anchors in `[[estimation]]` — not to forecast hours.

---

*Refinement log*
- INVEST Verdict: READY
- Amendment: added total match count to the results list (AC-3) — no conflict with existing search/empty-state ACs.
- Estimate: unchanged at 2 (pre-amendment: AC=2 edge=2 dep=1 → raw 4.7 → bucket 3, adjusted −1 for low-risk single dep; post-amendment: AC=3 edge=4 dep=0 → raw 5.4 → bucket 3, adjusted −1 for the copy-only edge case).

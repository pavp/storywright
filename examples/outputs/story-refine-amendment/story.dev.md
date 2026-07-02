# Customer search — Dev Notes

> Developer supplement to `story.standard.md`. Holds all technical detail stripped from the PM-facing files (rule 3a).

## Technical Considerations
- Search endpoint `GET /support/customers/search?q=<term>` matches on name and email with a debounced client-side query.
- Export endpoint `GET /support/customers/search/export?q=<term>&format=csv` streams the same result set the agent is currently viewing — no server-side re-query with stale filters.
- Feature flag `support_customer_search_export` gates the new "Export CSV" action independently of the base search flow.

## Edge Cases
- **Network — search request times out:** show a retry prompt; do not clear the last successful result set.
- **Data — customer record is soft-deleted:** exclude from search results; do not surface a broken link.
- **Permission — agent lacks export permission:** hide the "Export CSV" action rather than showing a disabled button with no explanation.
- **State — export requested while results are still loading:** disable "Export CSV" until the result set has settled.
- **UX — search term contains only whitespace:** treat as an empty query; do not submit a request.

## Analytics / Eventos
| Event | Trigger | Payload | Tag |
|---|---|---|---|
| `support_search_submitted` | agent submits a search | `surface`, `correlation_id` | 📊 |
| `support_search_results_exported` | agent taps "Export CSV" | `result_count`, `surface`, `correlation_id` | 📊 |
| `support_search_failed` | search request errors | `surface`, `correlation_id`, `error_code` | 🔧 |

> PII: no customer name/email in the payload — only counts and correlation IDs.

## Dependencias
| Dependencia | Owner | Estado | Bloquea? |
|---|---|---|---|
| CSV export permission flag wired to the support role model | Platform team | READY | No |
| Export endpoint added to the search service | Backend team | IN-PROGRESS | Sí |

## Riesgos
| Riesgo | L | I | Mitigación |
|---|---|---|---|
| Export of a very large result set blocks the UI thread | M | M | Stream server-side; cap client rendering to visible page |

## Definition of Done (full)
- [ ] Code merged to main behind the `support_customer_search_export` flag
- [ ] All ACs pass in QA, including the CSV export scenario
- [ ] Unit tests added; coverage does not decrease
- [ ] E2E covers search happy path + export happy path (`npm run test:e2e -- support-search`)
- [ ] `npm run lint` and `npm run test` clean
- [ ] Accessibility: keyboard-navigable, screen-reader labels, contrast ≥ WCAG AA
- [ ] Analytics events implemented and verified in dashboard
- [ ] No regressions in the critical-path E2E suite

## Estimate

**Story Points: 3** (Fibonacci)

| Signal | Value | Weight | Contribution |
|--------|-------|--------|--------------|
| Acceptance Criteria | 3 | ×1.0 | 3.0 |
| Edge Cases | 5 | ×0.6 | 3.0 |
| Dependencies | 2 | ×1.5 | 3.0 |
| High-severity Risks 🚨 | 0 | ×2.0 | 0.0 |
| Business Rules | 0 | ×0.5 | 0.0 |
| **Raw score** | | | **9.0** → bucket 5 |
| LLM adjustment | | | −1 → 3: dep "Export endpoint added to the search service" — reuses the existing search service's result set, no new data model, low integration risk despite IN-PROGRESS status |

> Planning note: story points reflect relative complexity, not time, commitment, or velocity. Use them to compare stories against the calibration anchors in `[[estimation]]` — not to forecast hours.

---

*Refinement log*
- INVEST Verdict: READY
- Amendment: added CSV export (AC-3) — no conflict with existing search/empty-state ACs.
- Estimate refreshed: was 2 pre-amendment (AC=2, edge=2, dep=1) → now 3 after the new AC/edge/dep signals.

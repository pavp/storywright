# Epic — New dashboard

## Objective / Hypothesis
For a user who needs to review their data regularly, a single-page dashboard that lets them view, filter, and search their records delivers faster access to the information they need — without paging through every record manually.

## Business Outcome(s)
- **Outcome A:** ⚠️ Assumed: reduce the time users spend locating a specific record, measured as a drop in manual review effort once filtering and search ship.
- **Outcome B:** ⚠️ Assumed: increase adoption of the dashboard as the primary data-review surface, measured by return usage once the core viewing/filtering/searching capability is available.

## In / Out of scope
**In scope this round:**
- Viewing records in a table with filtering.
- Free-text search within the filtered table.

**Out of scope this round (deferred — future children once this round ships):**
- Charts and visualizations.
- Exporting to CSV/PDF/Excel.
- Saving custom views.
- Sharing views with other users.
- Real-time updates.
- Role-based permissions.
- Responsive design for mobile.

## Core complexity
A single "manage everything" dashboard collapses two unrelated business concerns — viewing/finding data, and acting on it (exporting, sharing, customizing, receiving updates, controlling access). This round focuses only on the viewing/finding concern; the acting concern is deferred until the first concern is proven in production.

# Epic — New dashboard

**Why split:** INVEST failed on **I** (Independent — one story bundles ≥8 unrelated capabilities that cannot ship or be verified separately) and **S** (Small — the raw description names 10 distinct capabilities in a single AC, no single Given/When/Then can cover them; deterministic pre-split count = 8).

**Core complexity:** a single-page "manage everything" dashboard collapses two unrelated concerns — (a) viewing/filtering/exploring data, and (b) acting on it (export, share, customize, receive updates, control access).

**Pattern(s) applied:** Major effort (Story 1 does the heavy data-plumbing lift — fetch, render, filter, search — everything else builds on top of it) + Workflow steps (each follow-on story adds one full increment of sophistication, not a UI fragment).

**Cynefin domain:** Complicated — the capabilities are individually well-understood (filtering, export, sharing are all known problems), so all children are enumerable now; no exploratory learning-story needed.

## Children

| # | Title | Pattern | V audit |
|---|-------|---------|---------|
| 1 | Ver y filtrar el dashboard | Major effort | PASS |
| 2 | Buscar dentro del dashboard | Workflow steps | PASS |

**Deferred (not split into stories this round — see Notes):** charts/visualizations, export a CSV/PDF/Excel, guardar vistas personalizadas, compartir vistas, actualizaciones en tiempo real, permisos por rol, diseño responsive para móvil. Each is its own future child once Story 1 ships; drafting all 8 now would front-load scope no one has prioritized yet (INVEST **S** for the epic as a whole, not just per-child).

## Dependency matrix

Scope: only DRAFTED children (Story 1, Story 2).

|   | Story 1 — Ver y filtrar | Story 2 — Buscar |
|---|--------------------------|-------------------|
| **Story 1 — Ver y filtrar** | — | Story 2 depende de Story 1 (Given AC-1: "el dashboard está cargado con datos" implica que la vista y los filtros de Story 1 ya existen) |
| **Story 2 — Buscar** | ← necesita Story 1 | — |

**Build order:** Story 1 → Story 2

## V audit

- **Story 1 — Ver y filtrar el dashboard:** V = PASS. AC-1 ("se muestra una tabla con los registros y sus columnas principales", "se pueden aplicar uno o más filtros y la tabla se actualiza") es observable de forma independiente por un usuario real sin que exista ninguna otra story del epic — ya resuelve la necesidad de "ver mis datos filtrados en un solo lugar".
- **Story 2 — Buscar dentro del dashboard:** V = PASS. AC-1 ("al escribir en el buscador, la tabla se reduce a los registros que coinciden") es verificable de forma independiente; aunque depende de Story 1 para tener datos que buscar (rule 10), sigue entregando valor real y evaluable por sí sola una vez Story 1 está en producción — no es un fragmento de UI sin uso propio.

## Notes

- Recursive re-split check: neither Story 1 ni Story 2 vuelve a disparar el contador de pre-split (count = 1 en cada una) — ninguno de los dos hijos requiere split recursivo.
- Coherence check: Story 1 + Story 2 cubren "ver y encontrar datos en el dashboard", el subconjunto de alcance original que este round de split ataca. Las 7 capacidades restantes (charts, exports, vistas guardadas, compartir, tiempo real, permisos, responsive) quedan explícitamente fuera de este epic hasta que se decida priorizarlas — no se pierden, se enumeran arriba en Deferred para que el próximo split parta de esa lista en vez de re-derivarla del prompt original.

# Epic — New dashboard — Dev Notes

> Developer supplement to `epic.standard.md`. Holds the mechanical split decision trail (rule 3a — the epic follows the same PM↔dev split as every story).

**Why split:** INVEST failed on **I** (Independent — one story bundles ≥8 unrelated capabilities that cannot ship or be verified separately) and **S** (Small — the raw description names 10 distinct capabilities in a single AC, no single Given/When/Then can cover them; deterministic pre-split count = 8).

**Core complexity:** see `epic.standard.md` — a single-page "manage everything" dashboard collapses two unrelated concerns (viewing/filtering/exploring data vs. acting on it).

**Patterns applied:** Major effort (`01-ver-filtrar-dashboard` does the heavy data-plumbing lift — fetch, render, filter, search — everything else builds on top of it) + Workflow steps (each follow-on child adds one full increment of sophistication, not a UI fragment).

**Cynefin domain:** Complicated — the capabilities are individually well-understood (filtering, export, sharing are all known problems), so all children are enumerable now; no exploratory learning-story needed.

## Children

| # | Title | Pattern | V audit | Moves |
|---|-------|---------|---------|-------|
| 01 | Ver y filtrar el dashboard | Major effort | PASS | Outcome A |
| 02 | Buscar dentro del dashboard | Workflow steps | PASS | Outcome A |

Dev↔value bridge: `01-ver-filtrar-dashboard` moves Outcome A (viewing/filtering is the core mechanism the outcome measures). `02-buscar-dashboard` also moves Outcome A (search is the same "find data faster" mechanism, layered on filtering) and is a leading indicator toward Outcome B (search is the first capability likely to drive return usage once combined with filtering).

**Deferred (not split into stories this round — see `epic.standard.md` In/Out of scope):** charts/visualizations, export a CSV/PDF/Excel, saved custom views, sharing views, real-time updates, role-based permissions, responsive design for mobile. Each is its own future child once `01-ver-filtrar-dashboard` ships; drafting all 8 now would front-load scope no one has prioritized yet (INVEST **S** for the epic as a whole, not just per-child).

## Dependency matrix

Scope: only DRAFTED children (`01-ver-filtrar-dashboard`, `02-buscar-dashboard`).

|   | 01 — Ver y filtrar | 02 — Buscar |
|---|---------------------|-------------|
| **01 — Ver y filtrar** | — | 02 depende de 01 (Given AC-1: "el dashboard está cargado con datos" implica que la vista y los filtros de 01 ya existen) |
| **02 — Buscar** | ← necesita 01 | — |

**Build order:** 01-ver-filtrar-dashboard → 02-buscar-dashboard

## V audit

- **01 — Ver y filtrar el dashboard:** V = PASS. AC-1 ("se muestra una tabla con los registros y sus columnas principales", "se pueden aplicar uno o más filtros y la tabla se actualiza") es observable de forma independiente por un usuario real sin que exista ninguna otra story del epic — ya resuelve la necesidad de "ver mis datos filtrados en un solo lugar".
- **02 — Buscar dentro del dashboard:** V = PASS. AC-1 ("al escribir en el buscador, la tabla se reduce a los registros que coinciden") es verificable de forma independiente; aunque depende de 01 para tener datos que buscar (rule 10), sigue entregando valor real y evaluable por sí sola una vez 01 está en producción — no es un fragmento de UI sin uso propio.

## Notes

- Recursive re-split check: ni `01-ver-filtrar-dashboard` ni `02-buscar-dashboard` vuelven a disparar el contador de pre-split (count = 1 en cada una) — ninguno de los dos hijos requiere split recursivo.
- Coherence check: `01-ver-filtrar-dashboard` + `02-buscar-dashboard` cubren "ver y encontrar datos en el dashboard", el subconjunto de alcance original que este round de split ataca. Las 7 capacidades restantes (charts, exports, vistas guardadas, compartir, tiempo real, permisos, responsive) quedan explícitamente fuera de este epic hasta que se decida priorizarlas — no se pierden, se enumeran en `epic.standard.md` In/Out of scope para que el próximo split parta de esa lista en vez de re-derivarla del prompt original.

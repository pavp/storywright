# Ver y filtrar el dashboard — Dev Notes

> Developer supplement to `01-ver-filtrar-dashboard.standard.md`. Holds all technical detail stripped from the PM-facing files (rule 3a).

## Technical Considerations
- La tabla consume el endpoint `GET /dashboard/records?filters=<query>` con paginación server-side (`page`, `pageSize`).
- Los filtros disponibles se derivan del esquema de columnas devuelto por `GET /dashboard/schema`; no hardcodear la lista de filtros en el cliente.
- Aplicar los filtros actualiza el query string de la URL (`?filter[status]=active`) para que la vista filtrada sea compartible/bookmarkeable — esto es infraestructura para la futura story de "compartir vistas", no la implementa.
- Feature flag `dashboard_v2_table` para rollout gradual.

## Edge Cases
- **Data — usuario sin registros:** mostrar estado vacío con copy accionable ("Aún no tienes registros"), nunca una tabla vacía sin contexto.
- **Data — filtro que no matchea ningún registro:** mostrar estado vacío específico de filtro ("Ningún registro coincide con los filtros seleccionados") con opción de limpiar filtros.
- **Performance — dataset >10,000 registros:** paginación server-side obligatoria; nunca traer el dataset completo al cliente.
- **Network — fallo al cargar el esquema de columnas:** degradar a un set de columnas mínimo predefinido en el cliente en vez de bloquear la carga de la tabla.
- **Concurrency — filtros aplicados mientras la carga anterior sigue en curso:** cancelar la request en curso (AbortController) antes de disparar la nueva.

## Analytics / Eventos
| Event | Trigger | Payload | Tag |
|---|---|---|---|
| `dashboard_table_viewed` | el usuario carga el dashboard con datos | `record_count`, `surface` | 📊 |
| `dashboard_filter_applied` | el usuario aplica uno o más filtros | `filter_keys`, `result_count` | 📊 |
| `dashboard_table_empty_shown` | tabla vacía por falta de datos o por filtro sin match | `reason` (`no_data` \| `no_match`) | 🔧 |

> PII: no incluir contenido de los registros en el payload; usar solo conteos y claves de filtro.

## Dependencias
| Dependencia | Owner | Estado | Bloquea? |
|---|---|---|---|
| Endpoint `GET /dashboard/records` con paginación server-side | Backend team | IN-PROGRESS | Sí |
| Endpoint `GET /dashboard/schema` | Backend team | READY | No |

## Riesgos
| Riesgo | L | I | Mitigación |
|---|---|---|---|
| 🚨 Dataset grande sin paginación server-side lista a tiempo | M | H | Confirmar fecha del endpoint paginado antes de comprometer el sprint; fallback temporal con límite duro de 500 registros |
| Esquema de columnas cambia entre entornos | L | M | Contrato de API versionado; smoke test del esquema en CI |

## Definition of Done (full)
- [ ] Code merged a main detrás del flag `dashboard_v2_table`
- [ ] Todos los AC pasan en QA (AC-1)
- [ ] Unit tests de la tabla: render, aplicación de filtros, estado vacío
- [ ] E2E del happy path y del estado vacío por filtro (`npm run test:e2e -- dashboard-table`)
- [ ] `npm run lint` y `npm run test` limpios
- [ ] Comportamiento de paginación verificado con dataset >10,000 registros (mock)
- [ ] Accesibilidad: navegable por teclado, labels de lector de pantalla, contraste ≥ WCAG AA
- [ ] Eventos de analytics implementados y verificados en dashboard
- [ ] Sin regresiones en la suite E2E de critical path

## Estimate

**Story Points: 5** (Fibonacci)

| Signal | Value | Weight | Contribution |
|--------|-------|--------|--------------|
| Acceptance Criteria | 1 | ×1.0 | 1.0 |
| Edge Cases | 5 | ×0.6 | 3.0 |
| Dependencies | 2 | ×1.5 | 3.0 |
| High-severity Risks 🚨 | 1 | ×2.0 | 2.0 |
| Business Rules | 2 | ×0.5 | 1.0 |
| **Raw score** | | | **10.0** → bucket 5 |
| LLM adjustment | | | none — deterministic bucket retained |

> Planning note: story points reflect relative complexity, not time, commitment, or velocity. Use them to compare stories against the calibration anchors in `references/estimation.md` — not to forecast hours.

---

*Generation log*
- INVEST Verdict: READY
- Persona auto-inferida (usuario con datos recurrentes) — marcada Assumed en PM files.
- Pre-split count = 1 (un flujo de visualización/filtrado) → single-story path dentro del split.

# Buscar dentro del dashboard — Dev Notes

> Developer supplement to `story-2.standard.md`. Holds all technical detail stripped from the PM-facing files (rule 3a).

## Technical Considerations
- Búsqueda client-side sobre el resultset ya paginado/filtrado de Story 1 (`GET /dashboard/records?filters=<query>`) mediante un `search` param adicional que el mismo endpoint acepta — no es un endpoint nuevo.
- Debounce de 250ms en el input de búsqueda antes de disparar la request, para evitar saturar el endpoint en cada keystroke.
- El backend hace matching case-insensitive sobre las columnas principales indexadas (definidas en `GET /dashboard/schema`); no full-text search sobre columnas no indexadas.
- Feature flag `dashboard_v2_search`, dependiente de que `dashboard_v2_table` (Story 1) ya esté activo.

## Edge Cases
- **Data — búsqueda sin coincidencias:** mostrar estado vacío específico ("Ningún registro coincide con tu búsqueda") distinto del estado vacío de filtro sin match, para que el usuario entienda qué acción lo generó.
- **Network — fallo al ejecutar la búsqueda:** mantener la última tabla válida visible y mostrar un toast de error, nunca vaciar la tabla ante un error de red.
- **Concurrency — el usuario sigue escribiendo mientras la búsqueda anterior está en curso:** cancelar la request en curso (AbortController) y solo aplicar el resultado de la última búsqueda disparada.
- **Input — texto de búsqueda con caracteres especiales o muy largo (>200 chars):** sanitizar antes de enviar; truncar visualmente el input si excede el límite razonable de la UI.
- **State — usuario limpia el buscador:** volver exactamente al estado de tabla filtrada de Story 1, no al dataset sin filtros.

## Analytics / Eventos
| Event | Trigger | Payload | Tag |
|---|---|---|---|
| `dashboard_search_performed` | el usuario escribe y la búsqueda se ejecuta (post-debounce) | `query_length`, `result_count` | 📊 |
| `dashboard_search_empty_shown` | búsqueda sin coincidencias | `query_length` | 🔧 |
| `dashboard_search_cleared` | el usuario limpia el campo de búsqueda | `surface` | 📊 |

> PII: no incluir el texto de búsqueda en el payload; solo su longitud y el conteo de resultados.

## Dependencias
| Dependencia | Owner | Estado | Bloquea? |
|---|---|---|---|
| Story 1 — tabla y filtros del dashboard en producción | Frontend team | IN-PROGRESS | Sí |
| Parámetro `search` en `GET /dashboard/records` | Backend team | NOT-STARTED | Sí |

## Riesgos
| Riesgo | L | I | Mitigación |
|---|---|---|---|
| Búsqueda percibida como "no encuentra nada" por no ser full-text sobre todas las columnas | M | M | Comunicar el alcance de búsqueda en el placeholder del input ("Buscar por nombre, estado…") |

## Definition of Done (full)
- [ ] Code merged detrás del flag `dashboard_v2_search`, dependiente de `dashboard_v2_table`
- [ ] Todos los AC pasan en QA (AC-1)
- [ ] Unit tests del input de búsqueda: debounce, cancelación de requests en vuelo, limpieza
- [ ] E2E de búsqueda con y sin coincidencias, combinada con un filtro activo (`npm run test:e2e -- dashboard-search`)
- [ ] `npm run lint` y `npm run test` limpios
- [ ] Verificado que la búsqueda respeta los filtros ya aplicados (Story 1), no los ignora
- [ ] Accesibilidad: navegable por teclado, labels de lector de pantalla, contraste ≥ WCAG AA
- [ ] Eventos de analytics implementados y verificados en dashboard
- [ ] Sin regresiones en la suite E2E de critical path

## Estimate

**Story Points: 3** (Fibonacci)

| Signal | Value | Weight | Contribution |
|--------|-------|--------|--------------|
| Acceptance Criteria | 1 | ×1.0 | 1.0 |
| Edge Cases | 5 | ×0.6 | 3.0 |
| Dependencies | 2 | ×1.5 | 3.0 (sibling adj −1, depende de Story 1 ya estimada) |
| High-severity Risks 🚨 | 0 | ×2.0 | 0.0 |
| Business Rules | 1 | ×0.5 | 0.5 |
| **Raw score** | | | **6.5** → bucket 3 |
| LLM adjustment | | | none — deterministic bucket retained |

> Planning note: story points reflect relative complexity, not time, commitment, or velocity. Use them to compare stories against the calibration anchors in `references/estimation.md` — not to forecast hours.

---

*Generation log*
- INVEST Verdict: READY
- Independence: PARTIAL · depends on Story 1 (rule 10).
- Pre-split count = 1 (un flujo de búsqueda) → single-story path dentro del split.

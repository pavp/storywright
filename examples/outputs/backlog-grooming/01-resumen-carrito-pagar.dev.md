# Resumen del carrito antes de pagar — Dev Notes

> Developer supplement to `01-resumen-carrito-pagar.standard.md`. Holds all technical detail stripped from the PM-facing files (rule 3a).

## Technical Considerations
- El componente de resumen consume el endpoint `GET /cart/{cartId}` y actualiza cantidades vía `PATCH /cart/{cartId}/items/{itemId}`.
- Actualización de cantidades en tiempo real mediante estado local optimista: actualizar UI inmediatamente, confirmar con el servidor en segundo plano y revertir ante error.
- Verificar disponibilidad de stock al montar el componente (campo `stockStatus` en la respuesta del carrito); marcar visualmente los artículos sin stock e inhabilitar el botón "Continuar al pago".
- El precio unitario a mostrar es `item.priceAtCheckout`, no `item.priceWhenAdded` — leer la nota de Business Rule 1 antes de maquetar.
- Feature flag `checkout_cart_summary_v2` para rollout gradual si se reemplaza implementación existente.

## Edge Cases
- **Stock — artículo agotado entre añadir al carrito y abrir checkout:** marcar como no disponible; bloquear avance al pago; no lanzar error 500.
- **Concurrency — precio cambia mientras el comprador está en el resumen:** no recargar automáticamente; mostrar banner "Los precios han sido actualizados" con botón de refresco explícito.
- **Network — fallo al aplicar cambio de cantidad:** revertir cantidad a valor anterior; mostrar toast de error con opción de reintentar.
- **Edge — carrito con 0 artículos accedido directamente por URL:** redirigir o mostrar estado vacío per AC-3; nunca renderizar tabla vacía.
- **Performance — carrito con >50 líneas:** paginación o virtualización para evitar layout shift en el resumen.

## Analytics / Eventos
| Event | Trigger | Payload | Tag |
|---|---|---|---|
| `checkout_cart_summary_viewed` | el comprador entra al checkout con artículos | `cart_id`, `item_count`, `total_amount` | 📊 |
| `checkout_cart_quantity_changed` | el comprador modifica una cantidad | `cart_id`, `item_id`, `old_qty`, `new_qty` | 📊 |
| `checkout_cart_empty_shown` | el comprador accede al checkout sin artículos | `surface` | 🔧 |
| `checkout_cart_out_of_stock_shown` | artículo marcado sin stock al cargar | `cart_id`, `item_id` | 🔧 |

> PII: no incluir nombres de productos ni descripciones en el payload; usar `item_id` únicamente.

## Dependencias
| Dependencia | Owner | Estado | Bloquea? |
|---|---|---|---|
| Endpoint `GET /cart/{cartId}` con campo `stockStatus` | Backend team | IN-PROGRESS | Sí |
| Endpoint `PATCH /cart/{cartId}/items/{itemId}` | Backend team | READY | No |
| Definición de `priceAtCheckout` vs `priceWhenAdded` en el contrato de API | Product + Backend | NOT-STARTED | Sí |

## Riesgos
| Riesgo | L | I | Mitigación |
|---|---|---|---|
| Precio mostrado difiere del cobrado (Business Rule 1 sin contrato de API claro) | H | H | Spike de contrato de API antes de pickup |
| Inconsistencia de stock en tiempo real con carga alta | M | M | Cache corta (TTL 30s) en endpoint de carrito; invalidar en PATCH |

## Definition of Done (full)
- [ ] Code merged detrás del flag `checkout_cart_summary_v2`
- [ ] Todos los AC pasan en QA (AC-1, AC-2, AC-3)
- [ ] Unit tests del componente de resumen: renderizado, actualización optimista, revert ante error
- [ ] E2E del happy path y estado de carrito vacío (`npm run test:e2e -- checkout-cart-summary`)
- [ ] `npm run lint` y `npm run test` limpios
- [ ] Comportamiento de stock agotado verificado con mock de endpoint
- [ ] Accesibilidad: navegable por teclado, labels de lector de pantalla, contraste ≥ WCAG AA
- [ ] Eventos de analytics implementados y verificados en dashboard
- [ ] Sin regresiones en la suite E2E de critical path de checkout

## Estimate

**Story Points: 5** (Fibonacci)

| Signal | Value | Weight | Contribution |
|--------|-------|--------|--------------|
| Acceptance Criteria | 3 | ×1.0 | 3.0 |
| Edge Cases | 5 | ×0.6 | 3.0 |
| Dependencies | 3 | ×1.5 | 4.5 |
| High-severity Risks 🚨 | 0 | ×2.0 | 0.0 |
| Business Rules | 2 | ×0.5 | 1.0 |
| **Raw score** | | | **11.5** → bucket 5 |
| LLM adjustment | | | none — deterministic bucket retained |

> Planning note: story points reflect relative complexity, not time, commitment, or velocity. Use them to compare stories against the calibration anchors in `[[estimation]]` — not to forecast hours.

---

*Generation log*
- INVEST Verdict: READY
- Persona auto-inferida (comprador) — marcada Assumed en PM files.
- Pre-split count = 1 (un flujo de visualización/edición del carrito) → single-story path.
- Batch: checkout grooming — cohesion 100% (área compartida: checkout / carrito).

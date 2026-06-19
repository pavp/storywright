# Código de descuento en el checkout — Dev Notes

> Developer supplement to `story-2.standard.md`. Holds all technical detail stripped from the PM-facing files (rule 3a).

## Technical Considerations
- Validar y aplicar el código vía `POST /cart/{cartId}/discount` con body `{ "code": "PROMO123" }`; respuesta incluye `discountAmount`, `discountType` (`percent` | `fixed`), `newTotal`.
- Eliminar descuento vía `DELETE /cart/{cartId}/discount`.
- La validación de unicidad de uso (Business Rule 2) ocurre en el servidor; el cliente no debe cachear el estado de validez de un código.
- Actualización del total de forma optimista NO recomendada: esperar respuesta del servidor antes de actualizar UI para evitar mostrar descuentos inválidos.
- El campo `discountBase` en la respuesta indica sobre qué subtotal se calculó el descuento (Business Rule 3: excluye shipping e impuestos).

## Edge Cases
- **Concurrency — código de un solo uso reclamado por dos sesiones simultáneas:** el servidor devuelve 409; mostrar mensaje "Este código ya fue utilizado" sin bloquear el resto del checkout.
- **Network — timeout al aplicar el código:** no aplicar el descuento localmente; mostrar error de red con opción de reintentar.
- **Input — código con espacios o mayúsculas/minúsculas:** normalizar en el cliente (trim + uppercase) antes del POST para mejorar UX; el servidor también normaliza como segunda capa.
- **State — código aplicado, luego comprador modifica el carrito:** re-validar el código si el cambio de carrito afecta la elegibilidad (p. ej., el código requiere monto mínimo).
- **Edge — código válido pero que ya no aplica al carrito actual (cambio de categoría):** servidor devuelve `error_code: "not_applicable"`; mostrar mensaje diferenciado de "código inválido".

## Analytics / Eventos
| Event | Trigger | Payload | Tag |
|---|---|---|---|
| `checkout_discount_applied` | código válido aplicado con éxito | `cart_id`, `discount_code_hash`, `discount_type`, `discount_amount` | 📊 |
| `checkout_discount_rejected` | código inválido o expirado | `cart_id`, `error_code` | 🔧 |
| `checkout_discount_removed` | comprador elimina el descuento | `cart_id`, `discount_type` | 📊 |

> PII: nunca enviar el código de descuento en texto plano; usar `discount_code_hash` (SHA-256 sin salt para análisis de uso, sin exposición de PII).

## Dependencias
| Dependencia | Owner | Estado | Bloquea? |
|---|---|---|---|
| Endpoint `POST /cart/{cartId}/discount` con campo `discountBase` | Backend team | NOT-STARTED | Sí |
| Endpoint `DELETE /cart/{cartId}/discount` | Backend team | NOT-STARTED | Sí |
| Resumen del carrito (Story 1 — AC-1) para mostrar total actualizado | Frontend team | IN-PROGRESS | Sí |
| Sistema de promociones con API de validación de códigos | Marketing + Backend | IN-PROGRESS | Sí |

## Riesgos
| Riesgo | L | I | Mitigación |
|---|---|---|---|
| Race condition en código de un solo uso con alta concurrencia | M | H | Lock optimista en el servidor (idempotency key en el POST); test de carga antes del lanzamiento |
| Descuento aplicado sobre base incorrecta (incluye shipping) | M | H | Test de contrato contra `discountBase` en la respuesta de API |

## Definition of Done (full)
- [ ] Code merged detrás del flag `checkout_discount_code`
- [ ] Todos los AC pasan en QA (AC-1, AC-2, AC-3)
- [ ] Unit tests: aplicación exitosa, rechazo por código inválido, eliminación del descuento, normalización de input
- [ ] E2E del happy path y del rechazo de código inválido (`npm run test:e2e -- checkout-discount`)
- [ ] `npm run lint` y `npm run test` limpios
- [ ] Test de contrato del campo `discountBase` verificado
- [ ] Accesibilidad: campo de código navegable por teclado, mensajes de error accesibles, contraste ≥ WCAG AA
- [ ] Eventos de analytics implementados y verificados en dashboard (sin PII en payload)
- [ ] Sin regresiones en la suite E2E de critical path de checkout

## Estimate

**Story Points: 5** (Fibonacci)

| Signal | Value | Weight | Contribution |
|--------|-------|--------|--------------|
| Acceptance Criteria | 3 | ×1.0 | 3.0 |
| Edge Cases | 5 | ×0.6 | 3.0 |
| Dependencies | 4 | ×1.5 | 6.0 |
| High-severity Risks 🚨 | 0 | ×2.0 | 0.0 |
| Business Rules | 3 | ×0.5 | 1.5 |
| **Raw score** | | | **13.5** → bucket 8 |
| LLM adjustment | | | −1 → 5: dep "Resumen del carrito (Story 1 — AC-1)" — intra-batch sibling already in-progress reduces implementation uncertainty |

> Planning note: story points reflect relative complexity, not time, commitment, or velocity. Use them to compare stories against the calibration anchors in `[[estimation]]` — not to forecast hours.

---

*Generation log*
- INVEST Verdict: READY
- Persona auto-inferida (comprador) — marcada Assumed en PM files.
- Pre-split count = 1 (un flujo de aplicación de código de descuento) → single-story path.
- Batch: checkout grooming — cohesion 100% (área compartida: checkout / descuento).
- Dependencia detectada en AC Given: requiere resumen del carrito actualizado (Story 1).

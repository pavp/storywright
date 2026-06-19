# Backlog Summary — checkout-grooming

Generated: 2026-06-19 19:40
Items: 3
Drafted: 2 (story trios emitidos)
Split recommended: 1 (sin trio — ejecutar /storywright-story-split por ítem)

**Cohesion:** COHESIVE (100%, umbral 60%, driver: área compartida — checkout / carrito / pago)

## Stories

| # | Título | INVEST verdict | Independence |
|---|--------|----------------|--------------|
| 1 | Resumen del carrito antes de pagar | PASS | Independiente (no bloquea ni es bloqueada) |
| 2 | Código de descuento en el checkout | PASS | Depende de Story 1 (requiere total de carrito visible para mostrar descuento aplicado) |
| 3 | Flujo completo de pago (tarjeta, PayPal, transferencia, reintentos, reembolsos) | SPLIT RECOMMENDED (pre-split count ≥ 5) | No evaluada — requiere split antes de analizar dependencias |

## Dependency matrix

Alcance: solo ítems DRAFTED (Stories 1 y 2).

|   | Story 1 — Resumen del carrito | Story 2 — Código de descuento |
|---|-------------------------------|-------------------------------|
| **Story 1 — Resumen del carrito** | — | Story 2 depende de Story 1 (Given AC-1: "comprador está en el checkout" implica carrito visible con totales) |
| **Story 2 — Código de descuento** | ← necesita Story 1 | — |

**Build order:** Story 1 → Story 2

## V audit

- **Story 1 — Resumen del carrito:** V = PASS. AC-1 ("se muestra una lista"), AC-2 ("el total se actualiza"), AC-3 ("se muestra un mensaje") son observables de forma independiente. No hay "cuando el sistema hace X internamente" — todos son verificables desde la UI por QA.
- **Story 2 — Código de descuento:** V = PASS. AC-1 ("el total del pedido se actualiza mostrando el monto descontado"), AC-2 ("mensaje de error claro" + "total permanece sin cambios"), AC-3 ("el código se retira y el total vuelve al precio original") son todos verificables por el comprador o QA sin acceso a internals.

## Notes

- Story 3 (flujo completo de pago): SPLIT RECOMMENDED — pre-split count ≥ 5 (tarjeta, PayPal, transferencia, reintentos, reembolsos son flujos independientes). Ejecutar `/storywright-story-split` sobre este ítem antes del próximo sprint de grooming.

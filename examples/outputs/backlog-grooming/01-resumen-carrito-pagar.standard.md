# Resumen del carrito antes de pagar

**Summary:** Permitir que el comprador revise los productos, cantidades y total de su carrito justo antes de confirmar la compra, reduciendo errores de pedido y abandonos de último momento.

## User Story
- **As a** comprador que está a punto de pagar
- **I want to** ver un resumen de los artículos en mi carrito con cantidades, precios unitarios y total
- **so that** puedo confirmar que el pedido es correcto antes de introducir mis datos de pago

## Acceptance Criteria

**AC-1: Visualización del resumen al entrar al checkout**
- **Given** el comprador tiene al menos un artículo en el carrito
- **When** accede a la página de checkout
- **Then** se muestra una lista con nombre del producto, cantidad, precio unitario y subtotal por línea, más el total final del pedido

**AC-2: Cambio de cantidad desde el resumen**
- **Given** el comprador está viendo el resumen del carrito en el checkout
- **When** modifica la cantidad de un artículo
- **Then** el subtotal de esa línea y el total del pedido se actualizan de forma inmediata sin recargar la página

**AC-3: Carrito vacío**
- **Given** el comprador intenta acceder al checkout sin artículos en el carrito
- **When** carga la página de checkout
- **Then** se muestra un mensaje que indica que el carrito está vacío y un enlace para volver al catálogo

## Definition of Done
- Todos los criterios de aceptación pasan en QA
- El resumen refleja el estado real del carrito en tiempo real
- Accesible por teclado y lector de pantalla; contraste ≥ WCAG AA
- Revisado por ≥1 ingeniero; signoff de PM tras walkthrough

---

## Business Rules
1. El precio mostrado en el resumen es el vigente en el momento de cargar el checkout, no el del momento en que se añadió el artículo al carrito.
2. Si el stock de un artículo cae a cero entre que se añadió al carrito y se abre el checkout, el artículo aparece marcado como no disponible e impide continuar al pago.

> ⚠️ **Assumed:** persona = comprador autenticado o invitado que ya tiene artículos en el carrito (auto-inferido del contexto de checkout; confirmar si aplica también a flujo de guest checkout).

---

*Generation log*
- INVEST Verdict: READY
- Persona auto-inferida (comprador) — marcada Assumed en PM files.
- Pre-split count = 1 (un flujo de visualización del carrito) → single-story path.

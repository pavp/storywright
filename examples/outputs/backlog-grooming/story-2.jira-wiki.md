h2. Código de descuento en el checkout

*Summary:* Permitir que el comprador ingrese un código promocional durante el checkout para aplicar un descuento sobre el total antes de proceder al pago.

h3. User Story
* *As a* comprador que está en el checkout
* *I want to* ingresar un código de descuento y ver el precio reducido aplicado a mi pedido
* *so that* puedo aprovechar una promoción antes de completar la compra

h3. Acceptance Criteria

*AC-1: Aplicación exitosa de código válido*
* *Given* el comprador está en el checkout y tiene un código promocional vigente
* *When* ingresa el código en el campo de descuento y confirma
* *Then* el descuento se aplica y el total del pedido se actualiza mostrando el monto descontado y el nuevo total

*AC-2: Rechazo de código inválido o expirado*
* *Given* el comprador está en el checkout
* *When* ingresa un código inexistente, ya utilizado o vencido
* *Then* se muestra un mensaje de error claro indicando por qué no se puede aplicar y el total permanece sin cambios

*AC-3: Eliminación del descuento aplicado*
* *Given* el comprador tiene un código de descuento ya aplicado en el checkout
* *When* decide eliminar el descuento
* *Then* el código se retira y el total vuelve al precio original sin descuento

h3. Definition of Done
* (/) Todos los criterios de aceptación pasan en QA
* (/) Los mensajes de error son claros y accionables para el comprador
* (/) Accesible por teclado y lector de pantalla; contraste ≥ WCAG AA
* (/) Revisado por ≥1 ingeniero; signoff de PM tras walkthrough

----

h3. Business Rules
# Solo se puede aplicar un código de descuento por pedido.
# Los códigos son de un solo uso por cuenta de comprador, salvo que estén marcados como reutilizables en el sistema de promociones.
# El descuento se aplica sobre el subtotal de productos; no aplica sobre gastos de envío ni impuestos.

{panel:title=⚠️ Assumed}
persona = comprador autenticado o invitado en el checkout (auto-inferido del contexto de checkout; confirmar si los descuentos aplican también a guest checkout o requieren cuenta registrada).
{panel}

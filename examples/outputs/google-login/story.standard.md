# Login con Google

**Summary:** Permitir que un visitante nuevo se autentique con su cuenta de Google para evitar crear una contraseña.

## User Story
- **As a** visitante nuevo sin cuenta
- **I want to** iniciar sesión con mi cuenta de Google
- **so that** entro al producto sin crear ni recordar una contraseña nueva

## Acceptance Criteria

**AC-1: Login exitoso con cuenta válida**
- **Given** el visitante está en la pantalla de login
- **When** toca "Continuar con Google" y autoriza una cuenta de Google válida
- **Then** se crea su sesión y es redirigido al dashboard en menos de 3 segundos

## Definition of Done
- [ ] Todos los criterios de aceptación pasan en QA
- [ ] El flujo de error muestra copy accionable cuando la autorización falla o se cancela
- [ ] Eventos de analytics verificados en el dashboard
- [ ] Accesible por teclado y lector de pantalla; contraste ≥ WCAG AA
- [ ] Revisado por ≥1 ingeniero; signoff de PM tras walkthrough

---

## Business Rules
1. Solo cuentas de Google con email verificado pueden usar el login social.
2. Si la cuenta es de Workspace, el dominio debe estar en la lista de dominios permitidos.
3. La sesión expira tras 30 días de inactividad.

> ⚠️ **Assumed:** persona = visitante nuevo sin cuenta previa (auto-inferido del prompt "Permitir login con Google"; confirmar si aplica también a usuarios existentes con password).

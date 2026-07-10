# Ver y filtrar el dashboard

**Summary:** Permitir que el usuario vea sus datos en una tabla dentro del nuevo dashboard y los filtre para encontrar rápidamente lo que necesita, sin tener que revisar todos los registros manualmente.

## User Story
- **As a** usuario que necesita revisar sus datos con frecuencia
- **I want to** ver una tabla con mis registros en el dashboard y aplicar filtros sobre ella
- **so that** encuentro la información relevante sin tener que revisar todos los registros uno por uno

## Acceptance Criteria

**AC-1: Carga y filtrado de la tabla principal**
- **Given** el usuario tiene al menos un registro asociado a su cuenta
- **When** entra al dashboard y aplica uno o más filtros disponibles
- **Then** la tabla muestra únicamente los registros que cumplen los filtros seleccionados, con sus columnas principales visibles

## Definition of Done
- Todos los criterios de aceptación pasan en QA
- La tabla refleja el estado real de los datos del usuario en el momento de la carga
- Accesible por teclado y lector de pantalla; contraste ≥ WCAG AA
- Revisado por ≥1 ingeniero; signoff de PM tras walkthrough

---

## Business Rules
1. Solo se muestran registros asociados a la cuenta del usuario autenticado.
2. Los filtros aplicados se mantienen mientras el usuario permanece en la sesión del dashboard; se reinician al cerrar sesión.

> ⚠️ **Assumed:** persona = usuario ya autenticado con al menos un rol que le da acceso al dashboard (auto-inferido del prompt "dashboard … para gestionar todo en un solo lugar"; confirmar si aplica también a usuarios sin datos previos).

---

*Split log*
- INVEST Verdict: READY
- Persona auto-inferida (usuario con datos recurrentes) — marcada Assumed en PM files.
- Split desde "Build the new dashboard" — pre-split count original = 8; este hijo cubre ver + filtrar.

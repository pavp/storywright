# Buscar dentro del dashboard

**Summary:** Permitir que el usuario busque un registro específico dentro del dashboard escribiendo texto libre, para no depender solo de filtros predefinidos cuando ya sabe lo que está buscando.

## User Story
- **As a** usuario que sabe qué registro específico busca
- **I want to** escribir texto libre en un buscador dentro del dashboard
- **so that** encuentro ese registro sin tener que armar el filtro exacto que lo aísla

## Acceptance Criteria

**AC-1: Búsqueda reduce la tabla a coincidencias**
- **Given** el usuario está viendo la tabla del dashboard con datos cargados
- **When** escribe texto en el buscador
- **Then** la tabla se actualiza para mostrar únicamente los registros cuyo contenido coincide con el texto ingresado, en menos de 1 segundo

## Definition of Done
- Todos los criterios de aceptación pasan en QA
- La búsqueda funciona en combinación con los filtros ya aplicados (Story 1), no los reemplaza
- Accesible por teclado y lector de pantalla; contraste ≥ WCAG AA
- Revisado por ≥1 ingeniero; signoff de PM tras walkthrough

---

## Business Rules
1. La búsqueda opera sobre el conjunto de registros ya filtrado por Story 1, no sobre el dataset completo — busca dentro de lo que el usuario ya está viendo.

> ⚠️ **Assumed:** la búsqueda es sobre el contenido visible de las columnas principales, no búsqueda de texto completo dentro de campos no mostrados en la tabla (auto-inferido; confirmar alcance de búsqueda con el equipo de producto).

---

*Split log*
- INVEST Verdict: READY
- Independence: PARTIAL · depends on Story 1 (rule 10 — AC-1 asume que el dashboard ya está cargado y filtrado)
- Split desde "Build the new dashboard" — pre-split count original = 8; este hijo cubre la búsqueda de texto libre.

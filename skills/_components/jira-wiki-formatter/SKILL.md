---
name: jira-wiki-formatter
description: Render a story into both Jira wiki markup and standard CommonMark Markdown. Outputs two artifacts so the same story is copy-pasteable into Jira and into any MD-aware tool.
trigger: "internal use by story-* skills"
intent: Component skill that takes a structured story (all sections drafted) and produces two output files following the templates in story-generate/templates.
version: 1.0.0
inputs:
  - structured-story
outputs:
  - story.jira-wiki.md
  - story.standard.md
---

## Purpose

Stories need to live in Jira AND in any other markdown surface (Notion, Linear, GitHub Issues, internal wikis). Generate both representations from the same source.

## When to use

Final step in `story-generate` and `story-refine`. Always last.

## Inputs & interpretation

- **structured-story** — an object/dict with every section: title, description, user_story, contexto, objetivo, alcance, fuera_de_alcance, reglas_de_negocio, consideraciones_tecnicas, dependencias, riesgos, analytics, edge_cases, criterios_de_aceptacion, definition_of_done

## Application (step-by-step)

1. Render `story.jira-wiki.md` using Jira's wiki markup:
   - Headings: `h1. `, `h2. `, `h3. `
   - Bold: `*text*`
   - Italic: `_text_`
   - Code: `{{code}}` inline, `{code}…{code}` block
   - Lists: `* item`, `# item` (numbered)
   - Tables: `||header||header||` then `|cell|cell|`
   - Panels for callouts: `{panel:title=⚠️ Assumed}…{panel}`
2. Render `story.standard.md` using CommonMark:
   - Headings: `##`, `###`
   - Bold: `**text**`
   - Italic: `*text*`
   - Code: `` `inline` ``, ```` ``` ```` blocks
   - Lists: `- item`, `1. item`
   - Tables: standard pipe tables
   - Callouts: `> ⚠️ **Assumed:** …`
3. Section model = **core + optional**.

   **Core (always emit, in this order):**
   1. Title
   2. Summary
   3. User Story (As a / I want to / so that)
   4. Acceptance Criteria
   5. Definition of Done

   **Optional (emit only if non-empty, in this order, after a separator):**
   6. Contexto
   7. Business Goal
   8. Scope
   9. Out of Scope
   10. Business Rules
   11. Technical Considerations
   12. Dependencies
   13. Risks
   14. Analytics
   15. Edge Cases

4. **Drop any section with no real content.** An empty heading is noise. A story with only the 5 core sections is a valid output.
5. Emit both as fenced code blocks in the chat (so user can copy), and offer to save to disk when running from CLI.

## Examples

### Good — Jira wiki

```
h2. Login con Google

Permitir a usuarios autenticarse mediante OAuth con Google.

h3. User Story
*As a* visitante nuevo
*I want* iniciar sesión con mi cuenta de Google
*So that* puedo evitar crear una nueva contraseña.

h3. Criterios de Aceptación
*AC-1: Login exitoso*
* Given el usuario está en la pantalla de login
* When toca "Continuar con Google" y autoriza una cuenta válida
* Then es redirigido al dashboard en <3s

h3. Definition of Done
* (/) Code merged behind feature flag
* (/) ACs pass in QA
```

### Good — CommonMark

```
## Login con Google

Permitir a usuarios autenticarse mediante OAuth con Google.

### User Story
**As a** visitante nuevo
**I want** iniciar sesión con mi cuenta de Google
**So that** puedo evitar crear una nueva contraseña.

### Criterios de Aceptación
**AC-1: Login exitoso**
- Given el usuario está en la pantalla de login
- When toca "Continuar con Google" y autoriza una cuenta válida
- Then es redirigido al dashboard en <3s

### Definition of Done
- [ ] Code merged behind feature flag
- [ ] ACs pass in QA
```

## Common Pitfalls

- Mixing Jira and CommonMark in the same file. Pick one per file.
- Forgetting that Jira's `{code}` block doesn't support all languages — fall back to `{noformat}` for plain text.
- Emoji in Jira: works in cloud, often mangled in older self-hosted. Keep emojis to non-critical decoration.
- Empty headings. Drop.
- Wrong heading levels: CommonMark output uses `#` (H1) for title, `##` (H2) for sections. Jira uses `h2.` for title, `h3.` for sections. The canonical block in `[[storywright-base]]` uses `###`/`####` as taxonomy shorthand only — do not copy those levels into the rendered artifact.
- Emitting INVEST as a section: INVEST is a process step. Its verdict belongs in the log line only (`INVEST Verdict: READY`), never as a standalone section in the output file.

## References

- [[story-generate]] (templates live under `story-generate/templates/`)

<claude-specific>
Cache both syntax tables (Jira wiki and CommonMark) — they're stable.
</claude-specific>

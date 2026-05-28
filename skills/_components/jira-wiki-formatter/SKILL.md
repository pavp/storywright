---
name: jira-wiki-formatter
description: Render a story into three files: story.standard.md and story.jira-wiki.md (PM-facing, no technical detail) plus story.dev.md (dev-facing, full technical detail).
trigger: "internal use by story-* skills"
intent: Component skill that takes a structured story and produces three output files following the templates in story-generate/templates.
version: 2.0.0
inputs:
  - structured-story
outputs:
  - story.standard.md
  - story.jira-wiki.md
  - story.dev.md
---

## Purpose

Stories need to live in Jira AND in any other markdown surface (Notion, Linear, GitHub Issues, internal wikis). Generate both representations from the same source.

## When to use

Final step in `story-generate` and `story-refine`. Always last.

## Inputs & interpretation

- **structured-story** — an object/dict with every section: title, description, user_story, contexto, objetivo, alcance, fuera_de_alcance, reglas_de_negocio, consideraciones_tecnicas, dependencias, riesgos, analytics, edge_cases, criterios_de_aceptacion, definition_of_done

## Application (step-by-step)

## Audience separation — THREE files

| File | Audience | Technical detail |
|---|---|---|
| `story.standard.md` | PM, stakeholders | ❌ None — no file paths, no imports, no component names, no `npm run X` in DoD |
| `story.jira-wiki.md` | PM → Jira paste | ❌ None — same content as standard, Jira markup |
| `story.dev.md` | Developer | ✅ Full — file paths, imports, Technical Considerations, technical edge cases, full DoD with commands |

**What is "technical":** file paths, import statements, component/hook names, API method names, CLI commands (`npm run test`), null/undefined checks, browser API constraints (HTTPS, permissions), specific library flags.

**ACs in PM files must describe observable behavior only.** "A copy icon appears next to the email field and clicking it copies the value" — not "ContentCopyOutlinedIcon is rendered next to the email Typography block and calls navigator.clipboard.writeText()".

---

1. Render `story.jira-wiki.md` (PM-facing) using Jira's wiki markup:
   - Headings: `h1. `, `h2. `, `h3. `
   - Bold: `*text*`
   - Italic: `_text_`
   - Code: `{{code}}` inline, `{code}…{code}` block
   - Lists: `* item`, `# item` (numbered)
   - Tables: `||header||header||` then `|cell|cell|`
   - Panels for callouts: `{panel:title=⚠️ Assumed}…{panel}`
   - Strip all technical detail (see audience table above)
2. Render `story.standard.md` (PM-facing) using CommonMark:
   - Headings: `##`, `###`
   - Bold: `**text**`
   - Italic: `*text*`
   - Code: `` `inline` ``, ```` ``` ```` blocks
   - Lists: `- item`, `1. item`
   - Tables: standard pipe tables
   - Callouts: `> ⚠️ **Assumed:** …`
   - Strip all technical detail (see audience table above)
3. Render `story.dev.md` (dev-facing) using CommonMark:
   - Same structure as `story.standard.md` PLUS:
   - Technical Considerations section (file paths, imports, API calls)
   - Edge Cases section (null checks, error states, browser constraints)
   - DoD includes CLI commands and file-level criteria
   - Refinement log includes technical changes
4. Section model for PM files = **core + optional (non-technical)**.

   **Core (always emit, in this order):**
   1. Title
   2. User Story (As a / I want to / so that)
   3. Acceptance Criteria (observable behavior only)
   4. Definition of Done (acceptance criteria only, no commands)

   **Optional PM sections (emit only if non-empty):**
   5. Business Goal
   6. Scope / Out of Scope
   7. Business Rules

5. **Drop any section with no real content.** An empty heading is noise.
6. Emit `story.standard.md` and `story.jira-wiki.md` as fenced code blocks in chat (PM-facing). Do NOT emit `story.dev.md` in chat — write to disk only. File persistence is handled by the calling skill via the `Write` tool.

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

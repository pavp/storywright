## Purpose

Stories need to live in Jira Cloud, Notion, Linear, GitHub Issues, and any other Markdown surface. Generate a portable CommonMark PM file and a full developer-facing file from the same source.

## When to use

Final step in the generate and refine intents. Always last.

## Inputs & interpretation

- **structured-story** — an object/dict with every section: title, description, user_story, contexto, objetivo, alcance, fuera_de_alcance, reglas_de_negocio, consideraciones_tecnicas, dependencias, riesgos, analytics, edge_cases, criterios_de_aceptacion, definition_of_done

## Application (step-by-step)

## Audience separation — TWO files

| File | Audience | Technical detail |
|---|---|---|
| `story.standard.md` | PM, stakeholders | ❌ None — no file paths, no imports, no component names, no `npm run X` in DoD |
| `story.dev.md` | Developer | ✅ Full — file paths, imports, Technical Considerations, technical edge cases, full DoD with commands |

**The epic renders as a duo target too.** The split intent's epic output (`epic.standard.md` + `epic.dev.md`) obeys this SAME audience separation: `epic.standard.md` follows the PM no-technical-detail column (Objective/Hypothesis, Business Outcome(s), In/Out of scope, Core complexity — no file paths, matrices, or component names); `epic.dev.md` follows the dev full-detail column (Why split, Patterns, Cynefin, children table, dependency matrix, build order, V audit, Notes). Documentation note only — the epic is metadata, not a `structured-story` object, so it is composed inline by the split intent (see `SKILL.md` `#### split`), not rendered through this formatter's own render steps below.

**What is "technical":** file paths, import statements, component/hook names, API method names, CLI commands (`npm run test`), null/undefined checks, browser API constraints (HTTPS, permissions), specific library flags.

**ACs in PM files must describe observable behavior only.** "A copy icon appears next to the email field and clicking it copies the value" — not "ContentCopyOutlinedIcon is rendered next to the email Typography block and calls navigator.clipboard.writeText()".

---

**Pre-emit heading guard (apply before writing any section to any file):**
- `story.standard.md` and `story.dev.md`: title line must use `#`; every section heading must use `##`. If received content uses `###` or `####` for a section, demote it to `##` before emitting.

Apply silently — no log entry needed for heading-level corrections.

1. Render `story.standard.md` (PM-facing) using CommonMark:
   - Headings: `##`, `###`
   - Bold: `**text**`
   - Italic: `*text*`
   - Code: `` `inline` ``, ```` ``` ```` blocks
   - Lists: `- item`, `1. item`
   - Callouts: `> ⚠️ **Assumed:** …`
   - Strip all technical detail (see audience table above)
   - **No pipe tables.** PM files MUST NOT contain pipe-table Markdown (`| col | col |` rows). Render any tabular content as lists instead — Jira Cloud does not autoformat Markdown tables on paste.
   - **DoD projection:** when rendering the Definition of Done block in `story.standard.md`, strip `[ ]` from each item — emit `- ` plain bullets, not `- [ ]` checkboxes. Jira Cloud does not autoformat task-list syntax into interactive checkboxes; plain bullets paste cleanly. The dev file keeps `- [ ]` unchanged.
2. Render `story.dev.md` (dev-facing) using CommonMark:
   - Same structure as `story.standard.md` PLUS:
   - Technical Considerations section (file paths, imports, API calls)
   - Edge Cases section (null checks, error states, browser constraints)
   - DoD includes CLI commands and file-level criteria; uses `- [ ]` checkboxes
   - Refinement log includes technical changes
3. Section model for PM files = **core + optional (non-technical)**.

   **Core (always emit, in this order):**
   1. Title
   2. User Story (As a / I want to / so that)
   3. Acceptance Criteria (observable behavior only)
   4. Definition of Done (acceptance-only projection, plain `- ` bullets — no commands, no `- [ ]`)

   **Optional PM sections (emit only if non-empty):**
   5. Business Goal
   6. Scope / Out of Scope
   7. Business Rules

4. **Drop any section with no real content.** An empty heading is noise.
5. Emit `story.standard.md` as a fenced code block in chat (PM-facing). Do NOT emit `story.dev.md` in chat — write to disk only. File persistence is handled by the calling intent via the `Write` tool.

## Examples

### Good — CommonMark

```
# Login con Google

Permitir a usuarios autenticarse mediante OAuth con Google.

## User Story
**As a** visitante nuevo
**I want** iniciar sesión con mi cuenta de Google
**So that** puedo evitar crear una nueva contraseña.

## Criterios de Aceptación
**AC-1: Login exitoso**
- Given el usuario está en la pantalla de login
- When toca "Continuar con Google" y autoriza una cuenta válida
- Then es redirigido al dashboard en <3s

## Definition of Done
- Code merged behind feature flag
- ACs pass in QA
```

## Common Pitfalls

- Emitting `- [ ]` checkboxes in PM-file DoD — use plain `- ` bullets in `story.standard.md`; keep `- [ ]` only in `story.dev.md`.
- Including pipe tables in PM files — render tabular content as lists instead.
- Empty headings. Drop.
- Wrong heading levels: CommonMark output uses `#` (H1) for title, `##` (H2) for sections. The canonical block in `references/storywright-base.md` uses `###`/`####` as taxonomy shorthand only — do not copy those levels into the rendered artifact.
- Emitting INVEST as a section: INVEST is a process step. Its verdict belongs in the log line only (`INVEST Verdict: READY`), never as a standalone section in the output file.

## References

- see `templates/` (templates live under `templates/`, a sibling of `references/` in this skill)

<claude-specific>
Cache the CommonMark syntax table — it's stable. Remember: PM file DoD uses plain `- ` bullets; dev file DoD uses `- [ ]` checkboxes. PM files must not contain pipe tables.
</claude-specific>

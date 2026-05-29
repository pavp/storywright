# Storywright — Análisis de generación de historias: ¿depende del proyecto/código?

> **Audiencia:** Product, Engineering, AI Platform, Founders.
> **Naturaleza:** investigación técnica basada en evidencia del código + diseño evolutivo de plataforma.
> **Fecha:** 2026-05-29.
> **Veredicto en una línea:** storywright **NO depende de un proyecto ni de código existente** — es 100% *project-less* por diseño. El problema real no es "añadir lectura de repo", sino **gobernar el matiz runtime**: hoy el agente puede leer el workspace por iniciativa propia, pero storywright no controla ni declara esa fuente. Recomendación: **ask-first explícito** para clausurar el indeterminismo.

---

## 0. Cómo leer este reporte

Cada afirmación está etiquetada:

- **[HECHO]** — verificado en el código, con ruta y línea.
- **[INFERENCIA]** — deducción razonada a partir de los hechos.
- **[INCERTIDUMBRE]** — no observable desde el repo; requiere validación.

No se inventa comportamiento no observable. Donde la documentación y la implementación divergen, se señala explícitamente.

---

## 1. Resumen ejecutivo

storywright es un **pack de skills en Markdown** para Claude Code, distribuido como paquete npm que actúa de **instalador delgado**: copia archivos `.md` a `~/.claude/skills/` y `~/.claude/commands/`. No hay runtime, no hay llamadas a LLM en el código, no hay ingestión de código fuente.

Las 4 skills de alto nivel (`story-generate`, `story-refine`, `story-split`, `story-from-figma`) aceptan exclusivamente tres tipos de entrada: **texto, imagen y enlace de Figma**. Ninguna requiere — ni puede pedir, en su diseño actual — un repositorio, archivos fuente, análisis AST, indexing, embeddings, vector stores o grafo de dependencias.

El detalle técnico que aparece en `story.dev.md` (endpoints, feature flags, comandos `npm run …`) **no se lee de ningún proyecto**: se **infiere del requisito** mediante componentes de enriquecimiento. Es invención plausible basada en el conocimiento del modelo, no *grounding* contra código real.

**El matiz que genera confusión** — y el verdadero objeto de este reporte — es que cuando una skill corre dentro de Claude Code con un repositorio abierto, el **agente Claude** (el runtime, no storywright) *puede* decidir por su cuenta usar Read/Grep/Glob sobre el workspace. La skill no se lo ordena ni se lo prohíbe. Resultado: comportamiento **no determinista** y no reproducible — a veces la historia aterriza en tu código real, a veces inventa, y el usuario no sabe cuál ocurrió.

**Conclusión estratégica:** storywright debe **gobernar su fuente de verdad** en vez de delegarla al azar del agente. La vía recomendada es **ask-first explícito**: la skill pregunta una vez si debe aterrizar el detalle técnico contra el código abierto o inferirlo del requisito, declara la fuente con un banner, y persiste la decisión. Todo esto se logra con Markdown + herramientas nativas de Claude Code, **sin romper ningún invariante** del repo.

---

## 2. Hechos vs inferencias — tabla maestra

| # | Afirmación | Tipo | Evidencia |
|---|---|---|---|
| 1 | Las 4 skills aceptan solo `text`, `image`, `figma-link` | HECHO | frontmatter `inputs:` en cada `skills/*/SKILL.md` |
| 2 | El paquete npm es instalador delgado (copia archivos, nada más) | HECHO | `bin/storywright.mjs:11-16`, `scripts/install-skills.mjs` |
| 3 | No hay llamadas a LLM en el código | HECHO | cero deps de runtime en `package.json`; sin clientes HTTP/SDK |
| 4 | No hay AST / indexing / embeddings / vector store | HECHO | búsqueda exhaustiva en `scripts/` y `bin/`: solo ops de filesystem |
| 5 | `story.dev.md` se llena por componentes de enriquecimiento, no por lectura de archivos | HECHO | `storywright-base:225-231` (paso 8b) |
| 6 | Lo único que storywright lee del disco es `.storywright-context.json` del folder de output | HECHO | `storywright-base:65` ("Read only from the exact output folder… never search siblings or parents") |
| 7 | El detalle técnico del dev file es inferido del dominio, no del repo | INFERENCIA | `examples/outputs/google-login/story.dev.md:7-8,44` contiene specifics genéricos OAuth no atribuibles a ningún proyecto |
| 8 | El agente Claude puede leer el workspace por iniciativa propia al correr la skill | INCERTIDUMBRE | no observable en el repo; es comportamiento del runtime de Claude Code, fuera del control de storywright |
| 9 | Ese comportamiento no es gobernado por ninguna skill | HECHO | ningún paso del `Application` skeleton (`storywright-base:201-249`) instruye leer/escanear el workspace |

---

## 3. Dependencia del proyecto/código — respuesta directa

Pregunta original: *¿la generación requiere necesariamente repositorio / archivos fuente / estructura de proyecto / AST / indexing / embeddings / contexto de código / escaneo de workspace / source ingestion / vector stores / metadata del proyecto / dependency graph?*

**Respuesta: NO a todos.** [HECHO]

| Mecanismo | ¿Requerido? | Evidencia |
|---|---|---|
| Repositorio | No | inputs = text/image/figma; fixtures son prompts puros (`tests/fixtures/prompt-google-login.md` = `"Permitir login con Google"`) |
| Archivos fuente | No | ninguna skill declara input de tipo archivo de código |
| Estructura de proyecto | No | el `Application` skeleton nunca inspecciona estructura |
| Análisis AST | No | sin parsers; `scripts/lib/skills.mjs` solo parsea frontmatter de `SKILL.md` |
| Indexing | No | inexistente |
| Embeddings / vector stores | No | cero deps; sin código de similitud |
| Contexto de código | No | el contexto que persiste es de *decisiones de PM* (idioma, naming), no código |
| Escaneo de workspace | No (por diseño) | ver §5 (matiz runtime) |
| Source ingestion | No | inexistente |
| Metadata del proyecto | No | inexistente |
| Dependency graph | No*; existe un "dep matrix" pero es entre **historias hijas**, no entre módulos de código | `storywright-base:83-89` (rule 10): parsea líneas `Given:` de las historias, no archivos |

### ¿Qué módulos están acoplados al concepto de "proyecto"?

**Ninguno toca el proyecto del usuario.** [HECHO] El único acoplamiento a *disco* es:

- **`.storywright-context.json`** — memoria de decisiones de la corrida (idioma, `chrome_scope`, `naming_pattern`, `design_source`). Se lee y escribe **solo en el folder de output** de esa invocación (`storywright-base:65,81`). No es código fuente; es estado de sesión del propio storywright.
- **El instalador** (`scripts/install-skills.mjs`) toca `~/.claude/` y `~/.gitignore_global` — la máquina del usuario, no su proyecto.

### ¿Limitación técnica o decisión de producto?

**Decisión de producto/diseño, no limitación técnica.** [INFERENCIA] Nada impide técnicamente que una skill instruya a Claude a usar Read/Grep. La ausencia es deliberada: el invariante "**No LLM in code**" y el posicionamiento "*ambiguous inputs → Jira-ready story*" (README) apuntan a un producto de *discovery* funcional, no de análisis de código.

### Assumptions implícitas

1. El usuario llega con **intención funcional** (prompt/mockup/Figma), no con un codebase que diseccionar. [INFERENCIA]
2. El detalle técnico es **output para el dev** (en `story.dev.md`), no input. [HECHO — `storywright-base:41` rule 3a]
3. La historia es un **contrato a futuro**, por eso puede inventar endpoints/flags que aún no existen. [INFERENCIA]

---

## 4. Cómo se genera realmente `story.dev.md`

Esta sección desmonta la intuición de que "el dev file lee del folder".

**[HECHO]** El paso 8b del skeleton base (`storywright-base:225-231`) llena `story.dev.md` invocando **componentes de enriquecimiento**:

```
8b. Gather dev-file enrichment (feeds story.dev.md only — rule 3a):
   - [[edge-cases]]            → ### Edge Cases (ejes de fallo técnico)
   - [[risks-and-dependencies]] → ### Dependencias + ### Riesgos
   - [[analytics-events]]       → ### Analytics / Eventos
   - [[definition-of-done]]     → DoD con comandos CLI
   - [[business-rules]]         → invariantes de política
```

**[HECHO]** El frontmatter `inputs:` de cada uno de esos componentes es `story-context` / `domain-hints` / `acceptance-criteria` — **nunca** `source-files` / `workspace` / `repo`. Los componentes operan sobre la historia misma y conocimiento de dominio, no sobre archivos.

**[INFERENCIA] ¿De dónde sale entonces `POST /auth/google/callback`?** Del conocimiento del modelo sobre cómo se implementa "login con Google" (patrón OAuth 2.0 + PKCE estándar), rellenando una plantilla. Evidencia en el golden output:

- `examples/outputs/google-login/story.dev.md:7` → `POST /auth/google/callback`
- `:8` → feature flag `auth_google_login`
- `:44` → `npm run test:e2e -- auth-google`

Si el repo real del usuario usara `/api/v2/oauth/google`, storywright **no lo sabría** y escribiría igual el genérico inventado. Por eso `storywright-base:45-49` (rule 5) obliga a un **banner de confianza de fuente** — el sistema reconoce que infiere, no confirma.

> **Inconsistencia implementación ↔ expectativa de UX señalada:** el dev file *aparenta* estar aterrizado en un proyecto (nombres concretos, comandos ejecutables), pero su procedencia es inferencial. Un dev que copie `npm run test:e2e -- auth-google` puede asumir que ese script existe. Es exactamente el gap que el modo gobernado (§6) corrige.

---

## 5. El matiz runtime — el problema real

**[HECHO]** Ningún paso del `Application` skeleton (`storywright-base:201-249`) instruye a la skill a leer, escanear o consultar el workspace del usuario.

**[INCERTIDUMBRE — comportamiento del runtime, no del repo]** Cuando una skill de storywright corre **dentro** de Claude Code y hay un repositorio abierto, el agente Claude dispone de Read/Grep/Glob y *puede* decidir usarlos por su cuenta — por ejemplo, para "verificar" un endpoint antes de escribirlo. Esto:

1. **No está ordenado** por la skill (ningún paso lo pide).
2. **No está prohibido** por la skill.
3. **No es reproducible** — depende de la heurística del agente en ese momento.
4. **No se declara** — el output no dice si el detalle fue confirmado contra código o inventado.

**[INFERENCIA] Consecuencia:** la "fuente de verdad" del `story.dev.md` es indeterminada. El mismo prompt, en dos corridas, puede producir un dev file *grounded* o uno *inventado*, sin que el usuario distinga cuál. Esto es deuda de **gobernanza**, no de capacidad.

```
┌──────────────────────────────────────────────────────────────┐
│  HOY (no gobernado)                                            │
│                                                                │
│  prompt ──► skill (Markdown) ──► Claude redacta story.dev.md   │
│                                      │                         │
│                                      ├─ ¿lee el repo? 🎲       │
│                                      │   (decisión del agente, │
│                                      │    no de la skill)      │
│                                      └─ banner no refleja esto │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Estrategia recomendada — gobernar la fuente (ask-first explícito)

**Objetivo:** que storywright **declare y controle** su fuente de verdad, volviendo el comportamiento reproducible — sin añadir infraestructura.

### 6.1 Mecanismo (todo Markdown + nativo)

Reusa tres primitivos que la skill **ya tiene**:

1. **`AskUserQuestion`** (ya es el canal único de clarificación — rule 1).
2. **`.storywright-context.json`** (ya persiste decisiones — rule 9, `storywright-base:65-81`).
3. **Banner de fuente** (ya existe para visual — rule 5, `storywright-base:45-49`).

**Cambios propuestos (no implementados en este reporte — son la recomendación):**

| Cambio | Dónde | Naturaleza |
|---|---|---|
| Nuevo paso en el skeleton: "resolución de grounding" antes del 8b | `storywright-base` Application | 1 paso de prosa Markdown |
| Pregunta ask-first: *"¿Aterrizo el detalle técnico contra tu código abierto, o lo infiero del requisito?"* | vía `AskUserQuestion` | reusa primitivo existente |
| Campo nuevo `source_grounding: "inferred" \| "workspace-confirmed"` | schema de `.storywright-context.json` | 1 campo |
| Banner de fuente para el dev file: `**Source: inferred — specs no confirmados contra código**` vs `**Source: workspace-confirmed — verificado contra <archivos>**` | `jira-wiki-formatter` | reusa patrón rule 5 |
| En modo `workspace-confirmed`: instruir explícitamente "usa Grep/Glob para confirmar endpoint/flag/ruta reales; si no existen, marca `⚠️ Assumed`" | `story.dev.md` enrichment | prosa Markdown que **dirige** las herramientas nativas |

**[HECHO] Respeta todos los invariantes:** no hay LLM en código (sigue siendo Markdown), el paquete sigue siendo instalador delgado, y la separación PM↔dev intacta (el grounding solo afecta `story.dev.md`).

### 6.2 Por qué ask-first y no detection-first

| Criterio | Ask-first (recomendado) | Detection-first | Híbrido |
|---|---|---|---|
| Reproducibilidad | **Alta** (decisión explícita, persistida) | Media (depende de heurística de detección) | Alta |
| Fricción UX | 1 pregunta (la skill ya pregunta otras) | Cero | 1 pregunta condicional |
| Control del usuario | **Total** | Bajo (magia) | Alto |
| Latencia | Despreciable | Despreciable | Despreciable |
| Costo | Despreciable | Despreciable | Despreciable |
| Precisión del dev file | **Gobernada** | Variable | Gobernada |
| Complejidad de mantenimiento | **Baja** | Media | Alta |
| Determinismo | **Sí** | No garantizado | Sí |
| Riesgo de leer repo equivocado | Nulo (usuario confirma) | Real (detecta y asume) | Bajo |

**[INFERENCIA] Recomendación: ask-first.** Es el patrón que la skill ya usa para idioma, naming y chrome-scope. Convierte el azar del agente en una decisión declarada y persistida, con coste marginal cero. Detection-first introduce magia frágil (¿qué repo? ¿el folder de output o el workspace?). Híbrido es over-engineering para v1.

---

## 7. Flujos conversacionales ideales

### 7.1 Modo inferido (default sin workspace, o usuario elige inferir)

```
Usuario: /storywright-story-generate Permitir login con Google
Claude:  [auto-detect idioma ES, persona, pre-split count=1]
         [AskUserQuestion] "¿Cómo genero el detalle técnico (story.dev.md)?"
           ► Inferir del requisito (rápido, specs genéricos no confirmados)
             Confirmar contra mi código abierto
         Usuario: Inferir del requisito
         → story.dev.md banner: "Source: inferred — specs no confirmados contra código"
         → persiste source_grounding: "inferred"
```

### 7.2 Modo workspace-confirmed (usuario elige aterrizar)

```
         Usuario: Confirmar contra mi código abierto
Claude:  [Grep "oauth|google|callback" en el workspace abierto]
         → encuentra src/auth/google.ts → endpoint real /api/v2/oauth/google
         → encuentra flags.ts → no existe flag auth_google_login
         → story.dev.md:
            ✓ Confirmed: endpoint POST /api/v2/oauth/google (src/auth/google.ts)
            ⚠️ Assumed: feature flag auth_google_login (no encontrado en flags.ts)
         → banner: "Source: workspace-confirmed — verificado contra src/auth/"
         → persiste source_grounding: "workspace-confirmed"
```

### 7.3 Fallback

```
         Usuario: Confirmar contra mi código abierto
Claude:  [Grep/Glob → workspace vacío o sin matches]
         → "No encontré código relacionado en el workspace. Caigo a modo inferido
            y marco los specs como Assumed."
         → no re-pregunta; degrada con transparencia
```

---

## 8. Diseño dual — ambos modos como ciudadanos de primera clase

**[INFERENCIA]** Los dos modos no compiten; son complementarios y deben **coexistir permanentemente**, gobernados por una sola decisión persistida:

| Eje | Modo *inferred* (project-less) | Modo *workspace-confirmed* (project-aware) |
|---|---|---|
| Caso de uso | Greenfield, PRD→backlog, idea→historia, brainstorming | Refinamiento sobre código existente, backlog de proyecto vivo |
| Fuente del dev file | Conocimiento de dominio del modelo | Read/Grep/Glob sobre workspace + dominio para huecos |
| Garantía | Plausible, contrato a futuro | Aterrizado; huecos marcados `⚠️ Assumed` |
| Default | Sí (cuando no hay workspace o usuario no opta) | Opt-in vía ask-first |
| Infra requerida | Ninguna (estado actual) | Ninguna nueva — solo prosa que dirige herramientas nativas |
| Invariantes | Intactos | Intactos |

**¿Fusionarse en arquitectura contextual única?** [INFERENCIA] Sí — no son dos productos, son **un parámetro** (`source_grounding`) de un mismo pipeline. El skeleton base no cambia salvo un paso de resolución de fuente. El modo *inferred* es el comportamiento de fallback natural del *workspace-confirmed* cuando no hay matches (§7.3).

---

## 9. Roadmap

### MVP (quick wins — días, solo Markdown)
1. Añadir paso "resolución de grounding" al `Application` de `storywright-base`. **[quick win]**
2. Pregunta ask-first vía `AskUserQuestion` con default `inferred`. **[quick win]**
3. Banner de fuente en `story.dev.md` (reusa patrón rule 5). **[quick win]**
4. Campo `source_grounding` en `.storywright-context.json` + actualizar schema (rule 9). **[quick win]**
5. Actualizar golden outputs + `tests/skills-shape.test.mjs` para aseverar presencia del banner.

**Métrica de éxito MVP:** 100% de los `story.dev.md` declaran su fuente; cero corridas con fuente indeterminada.

### Fase intermedia (semanas)
6. En modo `workspace-confirmed`: instrucciones Markdown que dirigen Grep/Glob y exigen marcar `⚠️ Assumed` lo no encontrado.
7. Métrica de *grounding rate*: % de specs del dev file confirmados vs assumed (reportado en el log de generación).
8. Detection-first **opt-in** como conveniencia (detecta workspace y pre-selecciona la opción en el AskUserQuestion, sin saltarse la confirmación).

**Métrica:** *grounding rate* ≥ X% en corridas sobre repos reales; reducción de specs inventados que no existen.

### Arquitectura objetivo
9. Pipeline contextual único con `source_grounding` como parámetro de primera clase; *inferred* es el fallback formal de *workspace-confirmed*.
10. Banner + log siempre declaran procedencia por sección.

**Métrica norte:** un dev nunca recibe un spec ejecutable (comando/endpoint/flag) sin saber si es real o asumido.

---

## 10. Riesgos, anti-patterns y tradeoffs

### Riesgos
- **Regresión de tests de "no leakage":** el modo workspace-confirmed leerá nombres reales (archivos, imports) — deben seguir cayendo solo en `story.dev.md`, nunca en los PM files (`tests/skills-shape.test.mjs` ya lo aserta). [HECHO — test existe]
- **Workspace equivocado:** ask-first lo mitiga (el usuario confirma); detection-first lo arriesga.
- **Falsa sensación de grounding:** sin banner, el usuario asume que un spec inventado es real. El banner es el control.

### Anti-patterns a evitar
- ❌ Añadir embeddings / vector store / servidor al paquete → rompe "instalador delgado" e "No LLM in code". No es necesario: Read/Grep/Glob nativos bastan.
- ❌ Detection-first silencioso que lee el repo sin avisar → reintroduce el indeterminismo que queremos eliminar.
- ❌ Meter detalle de código en los PM files → viola rule 3.
- ❌ Re-preguntar el grounding en cada corrida → persistir en `.storywright-context.json` (rule 9).

### Backward compatibility
Total. El default `inferred` reproduce el comportamiento actual de las skills. El cambio es **aditivo**: declara lo que hoy es implícito. Sin breaking change para usuarios existentes.

---

## 11. Conclusión accionable

1. **[HECHO]** storywright hoy genera historias **sin proyecto**, por diseño. No lee código. El detalle técnico es inferido.
2. **[HECHO]** El único acceso a disco es `.storywright-context.json` del folder de output — estado de sesión, no código.
3. **[INFERENCIA]** El problema real es el **matiz runtime no gobernado**: el agente puede leer el repo por su cuenta, sin que la skill lo declare ni controle.
4. **Recomendación:** **gobernar la fuente con ask-first explícito** — un paso Markdown + un campo en el JSON de contexto + un banner. Cero infra nueva. Invariantes intactos.
5. **Resultado:** ambos modos (inferred / workspace-confirmed) coexisten como un parámetro de un pipeline único, con comportamiento reproducible y procedencia siempre declarada.

> **Mejor estrategia de producto y plataforma:** no construir un segundo producto "project-aware", sino **clausurar la indeterminación del producto actual** convirtiendo el accidente del runtime en una decisión declarada, persistida y transparente. Es la intervención de mayor impacto al menor costo y riesgo.

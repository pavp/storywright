# Login con Google — Dev Notes

> Developer supplement to `story.standard.md`. Holds all technical detail stripped from the PM-facing files (rule 3a).

## Technical Considerations
- OAuth 2.0 Authorization Code flow con PKCE contra Google Identity (`accounts.google.com/o/oauth2/v2/auth`).
- Backend: endpoint `POST /auth/google/callback` intercambia el `code` por tokens; crea/recupera el usuario por `sub` del IdP, no por email.
- Feature flag `auth_google_login` para rollout gradual.
- Lista de dominios Workspace permitidos leída de config service, NO de env var (evita drift entre entornos).

## Edge Cases
- **Network — timeout en el callback de OAuth:** mostrar prompt de reintento; no crear sesión huérfana.
- **Concurrency — misma cuenta de Google en dos pestañas:** la segunda pestaña hereda la misma sesión.
- **Permission — dominio Workspace no permitido:** toast de error con contacto del admin.
- **State — ya existe cuenta con email/password:** enrutar al flujo de account-linking, no crear duplicado.
- **UX — botón "atrás" durante el consent:** vuelve a la pantalla de login sin estado parcial.

## Analytics / Eventos
| Event | Trigger | Payload | Tag |
|---|---|---|---|
| `login_google_started` | tap "Continuar con Google" | `surface`, `correlation_id` | 📊 |
| `login_google_completed` | sesión creada | `user_id`, `surface`, `correlation_id` | 📊 |
| `login_google_failed` | error en el callback | `surface`, `correlation_id`, `error_code` | 🔧 |

> PII: solo hashes de email. Nunca emails crudos en el payload.

## Dependencias
| Dependencia | Owner | Estado | Bloquea? |
|---|---|---|---|
| Credenciales Google OAuth en staging | Platform team | READY | No |
| Lista de dominios Workspace en config service | Platform team | IN-PROGRESS | Sí |
| Revisión legal del copy de consentimiento | Legal — @sam | NOT-STARTED | Sí |

## Riesgos
| Riesgo | L | I | Mitigación |
|---|---|---|---|
| 🚨 Edge cases de account-linking no scopeados | H | H | Spike antes de pickup; documentar matriz de edge cases |
| Latencia del callback en redes lentas | M | L | Timeout + retry; patrón reusado del flujo de signup |

## Definition of Done (full)
- [ ] Code merged a main detrás del flag `auth_google_login`
- [ ] Todos los AC pasan en QA
- [ ] Unit tests añadidos; cobertura no decrece
- [ ] E2E del happy path + al menos un modo de fallo (`npm run test:e2e -- auth-google`)
- [ ] `npm run lint` y `npm run test` limpios
- [ ] Accesibilidad: navegable por teclado, labels de lector de pantalla, contraste ≥ WCAG AA
- [ ] Eventos de analytics implementados y verificados en dashboard
- [ ] Estados de error con copy accionable
- [ ] Sin regresiones en la suite E2E de critical path

---

*Generation log*
- INVEST Verdict: READY
- Persona auto-inferida (visitante nuevo) — marcada Assumed en PM files.
- Pre-split count = 1 (un solo flujo de auth) → single-story path.

# Guías del proyecto

## Nomenclatura

### Branches
Formato: `<DOMINIO>-<NUMERO>` (ej. `EVE-1001`). El prefijo de dominio indica el área del proyecto
y debe estar registrado en `.husky/domains.config` (el hook `pre-push` lo valida).

| Prefijo | Dominio                    |
|---------|----------------------------|
| `EVE`   | events                     |
| `DMS`   | dagger_masters             |
| `PLY`   | players / session_players  |
| `AUTH`  | autenticación / auth       |
| `PAY`   | pagos / plataforma de pago |
| `SES`   | sesiones (general)         |
| `INF`   | infraestructura / devops / CI |
| `CHR`   | chores / mantenimiento     |

**Nuevo dominio**: añade una línea en `.husky/domains.config` y actualiza esta tabla.

### Commits
Conventional Commits estándar (forzado por commitlint en el hook `commit-msg`):
- `feat: ...`
- `fix: ...`
- `chore: ...`
- `docs: ...`
- `refactor: ...`
- `test: ...`
- `perf: ...`
- `style: ...`
- `build: ...`
- `ci: ...`

### Pull Requests
Título del PR siguiendo la misma convención que los commits (ej. `feat: agregado de eventos`).
Los checks locales corren vía `sh .husky/pre-push` (lint + typecheck + tests).

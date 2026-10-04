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
| `SUP`   | soporte / feedback / issues |
| `PLA`   | plataforma (general / transversal) |

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
En ejecución manual los checks validan el working tree; sólo cuando el hook lo dispara un
`git push` se guardan los cambios sin comitear en un stash temporal para validar únicamente el
código comiteado (y se restauran al terminar). `SKIP_STASH=1 git push` desactiva ese stash.

## Dependencias

### h3 y el hoisting de pnpm
El runtime usa `h3@1` porque `nitropack@2.x` (Nuxt 4.5.1) depende de `h3@^1.15.11`. La única
copia de `h3@2` del árbol viene de desarrollo (`@nuxt/eslint` → `@eslint/config-inspector` →
`devframe`) y sólo la usan DevTools y el inspector de ESLint: `devframe` importa `H3`,
`toNodeHandler` y `defineHandler`, que no existen en h3 v1.

Varios paquetes de Nuxt importan `h3` sin declararlo. Con el layout aislado de pnpm esos imports
se resuelven contra el directorio privado `node_modules/.pnpm/node_modules/h3`, donde sólo cabe
un symlink: si dos versiones se hoistan a la vez, gana la última que escribe pnpm y puede cambiar
entre instalaciones sin que cambie el código.

Por eso `pnpm-workspace.yaml` declara `packageExtensions` con `h3: ^1.15.11` para esos paquetes
(`@nuxt/icon`, `@nuxt/schema`, `@nuxtjs/supabase`, `nuxt`, `nuxt-csurf`, `nuxt-security`).

- **No** añadir un override global de `h3`: rompe `devframe`, DevTools y el inspector de ESLint.
- Si vuelve el error `event.req.headers.get is not a function` (como `unhandledRejection` en cada
  request aunque las páginas respondan 200), el slot hoisteado está apuntando a h3 v2: comprobar
  con `readlink node_modules/.pnpm/node_modules/h3` y añadir el paquete culpable a
  `packageExtensions`, sin editar el lockfile a mano.
- pnpm 11 lee su configuración desde `pnpm-workspace.yaml`; un bloque `pnpm` en `package.json` se
  ignora (avisa por consola).

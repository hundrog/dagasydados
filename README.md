# Dagas y Dados

Plataforma de gestión de sesiones de juego de rol (D&D y otros sistemas) con panel de administración para masters.

## Features

- **Landing pública** con catálogo de sesiones, filtros y reservas.
- **Panel de administración** (`/admin`) con autenticación vía Supabase.
- **Gestión de masters** (`/admin/masters`): alta, edición y borrado.
- **Gestión de sesiones** (`/admin/sessions`): crear y editar sesiones con recurrencia (RRULE), imagen, modalidad, ubicación y más.
- **Roles y permisos**:
  - **Admin**: control total sobre masters y sesiones, y ve todos los masters al asignar una sesión.
  - **Master (owner)**: puede editar/borrar solo sus propios registros (su perfil y sus sesiones) y solo se ve a sí mismo al crear/editar sesiones.

## Stack

- [Nuxt 4](https://nuxt.com) + [Nuxt UI](https://ui.nuxt.com) + Tailwind CSS
- [Supabase](https://supabase.com) (auth, base de datos y storage) vía [`@nuxtjs/supabase`](https://supabase.nuxtjs.org)
- [nuxt-security](https://nuxt.com/modules/security)
- Zod para validación de formularios
- RRule para las repeticiones de sesiones

## Requisitos

- Node.js 22+
- pnpm 11+
- Un proyecto de Supabase con las siguientes tablas:
  - `dagger_masters` — masters (id, full_name, user_name, phone, avatar_url)
  - `game_sessions` — sesiones de juego (referencia a `dagger_masters` vía `master_id`)
  - `game_exceptions` — excepciones a la recurrencia de una sesión
  - `admins` — ids de masters con rol de administrador (FK a `dagger_masters.id`)

## Setup

1. Instala las dependencias:

   ```bash
   pnpm install
   ```

2. Configura las variables de entorno en un archivo `.env` (ver `.env.example`):

   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_KEY=tu_clave_publica_o_de_servicio
   ```

3. Configura en Supabase:
   - Autenticación por email/password y, opcionalmente, OAuth con Discord.
   - Políticas RLS en las tablas según los roles que definas.

## Scripts

| Comando             | Descripción                                        |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | Servidor de desarrollo en `http://localhost:3000`  |
| `pnpm build`        | Build de producción (`nuxt build`)                 |
| `pnpm preview`      | Previsualiza el build de producción                |
| `pnpm lint`         | Lint con ESLint                                    |
| `pnpm typecheck`    | Typecheck con `nuxt typecheck`                     |
| `pnpm postinstall`  | Genera tipos y prepara Nuxt                        |

## Estructura

```
app/
├── components/
│   ├── admin/          # Formularios y UI del panel
│   └── landing/        # Componentes de la página pública
├── composables/        # useIsAdmin, useSessionImage
├── layouts/            # admin, default
├── pages/
│   ├── admin/          # masters, sessions (nuevo/editar), index
│   ├── blog/           # Blog (índice, detalle, crear)
│   ├── index.vue       # Landing
│   ├── login.vue
│   └── confirm.vue     # Callback post-login
└── types/              # Tipos de la base de datos y del dominio
```

## Roles y permisos

El rol se determina a partir del usuario autenticado de Supabase:

- **Admin**: su `id` existe en la tabla `admins`.
- **Owner**: el registro de `dagger_masters` coincide con su `id` de Supabase.

En las tablas de masters y sesiones, las acciones **editar** y **borrar** están habilitadas solo para admins o el owner del registro. Al crear/editar una sesión, el selector de master muestra todos los masters para admins y solo el propio para el resto.

## CI

[GitHub Actions](.github/workflows/ci.yml) ejecuta lint y typecheck en cada push.

# 🔍 Reporte de Revisión de Código — Dagas y Dados

**Proyecto:** Dagas y Dados (Nuxt 4 + Supabase + Pinia)
**Fecha de revisión:** 2026-08-12
**Alcance:** Cliente (Vue 3 / Nuxt 4), stores Pinia, composables, server routes, configuración.

> Resumen: el proyecto está bien estructurado (tipos generados de Supabase, `nuxt-security` activo, `.env` excluido de git, validaciones con Zod, manejo de RRULE robusto, script de limpieza de assets), pero tiene **2 bugs funcionales críticos** y **varios vacíos de seguridad que dependen 100% de políticas que no están versionadas en el repo**.

---

## 🔴 Críticos (Seguridad)

### 1. Control de acceso solo en el cliente (Auth Bypass potencial)
**Archivos:**
- `app/stores/useAdminStore.ts`
- `app/pages/admin/masters.vue`
- `app/pages/admin/sessions/index.vue`
- `app/pages/admin/profile/[id]/edit.vue`
- `app/components/admin/SessionForm.vue`

Todas las decisiones de "¿puede este usuario borrar/editar?" se hacen en el cliente leyendo `isAdmin` desde Pinia. Un usuario con DevTools puede:
- Modificar el array de masters en memoria y disparar `delete()` directo.
- O simplemente llamar a `supabase.from('dagger_masters').delete()` desde la consola del navegador.

**Mitigación real:** las **Row Level Security (RLS) policies** de Supabase deben ser la única fuente de verdad. Mientras la DB permita operaciones a cualquier usuario autenticado, el control JS es decorativo.

**Acción:**
1. En Supabase, crear policies en `dagger_masters`, `game_sessions`, `session_players` (idealmente migraciones SQL versionadas, que **no están en el repo**).
2. Definir un rol `admin` vía `auth.users.app_metadata` o tabla `admins` con RLS recursiva.
3. Hacer que el cliente **no confíe** en la flag local: usar `.eq('id', user.id)` directo en queries o funciones RPC con `SECURITY DEFINER`.

---

### 2. Bug: el login no autentica
**Archivo:** `app/pages/login.vue:30-33`

```ts
function onSubmit(payload: FormSubmitEvent<Schema>) {
  console.log('Submitted', payload)
}
```

El handler `@submit` **solo hace console.log**, no llama a `supabase.auth.signInWithPassword`. El form dice "Inicia sesión con Discord" pero permite email/password sin hacer nada. La única vía funcional es el botón de Discord.

**Acción:** Implementar la autenticación real, o quitar los campos email/password del form si solo quieres Discord.

---

### 3. Falta de validación de tipo MIME en uploads
**Archivos:**
- `app/composables/useMasterAvatar.ts`
- `app/composables/useSessionImage.ts`

Solo se valida `accept="image/*"` (que es **solo del lado del cliente** y trivial de bypassear) y el tamaño (5 MB). Nada verifica que el archivo subido sea realmente una imagen ni que el bucket esté configurado con límites. En Supabase Storage, si el bucket es público, se puede servir HTML/JS disfrazado de `.jpg`.

**Acción:**
1. Configurar el bucket con `allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']` y `fileSizeLimit: 5242880`.
2. Verificar el tipo real del archivo con `await file.arrayBuffer()` y los magic bytes antes de subir.
3. No usar el mismo bucket para `sessions/` y `avatars/` (riesgo de colisión de paths y reglas distintas).

---

### 4. `SESSION_IMAGES_BUCKET` y `AVATARS_BUCKET` apuntan al mismo bucket
**Archivos:**
- `app/composables/useMasterAvatar.ts:1`
- `app/composables/useSessionImage.ts:1`

```ts
const SESSION_IMAGES_BUCKET = 'game-session-images'
const AVATARS_BUCKET = 'game-session-images' // mismo bucket
```

Si un master borra su avatar vía `deleteMasterAvatarByUrl`, y la URL coincide por casualidad con una imagen de sesión, se podría borrar contenido ajeno (aunque `pathFromUrl` con prefijo `avatars/` lo mitiga parcialmente).

**Acción:** Crear un bucket separado `master-avatars` con sus propias policies.

---

## 🟠 Altos (Correctitud/Seguridad)

### 5. Bug: `user.value?.id` vs `user.value?.sub`
**Archivo:** `app/pages/admin/sessions/index.vue:18`

```ts
const canModify = (session: GameSessionWithMaster) => isAdmin.value || session.master_id === user.value?.id
```

En Supabase, `useSupabaseUser()` retorna un objeto con `id` mapeado desde `sub` (en versiones recientes) o sin `id` (en otras). El resto del código usa correctamente `user.value?.sub`. Esto significa que **un master normal nunca verá habilitados los botones de editar/borrar sus propias sesiones** en la tabla admin, aunque RLS sí le permita hacerlo en la DB.

**Acción:** Cambiar a `user.value?.sub`.

---

### 6. `ReserveForm` sin protección contra abuso
**Archivo:** `app/components/landing/ReserveForm.vue:46-57`

Un atacante puede llamar `insert` en `session_players` ilimitadamente. No hay:
- Rate limiting en el cliente (trivial de bypassear).
- Validación de `max_players` antes del insert (depende 100% de un trigger/RLS que puede o no existir).
- Captcha/hCaptcha.
- Sanitización de `name` (caracteres de control, XSS almacenado si la tabla se renderiza en otro lado).

**Acción:**
1. Verificar que la DB rechace insert si `count(*) >= max_players` (constraint o trigger).
2. Añadir rate limiting (Cloudflare Turnstile, Upstash, o un edge middleware de Nuxt).
3. Sanitizar `name` con un `.replace(/[^\p{L}\p{N}\s\-_.]/gu, '').slice(0, 80)`.

---

### 7. `confirm.vue` redirige a edición de perfil por defecto
**Archivo:** `app/pages/confirm.vue:11`

```ts
return navigateTo(path || `/admin/profile/${user.value.sub}/edit`, { replace: true })
```

Si un usuario inicia sesión por primera vez sin haber completado su perfil, lo mandas a un 404 (no existe aún en `dagger_masters`).

**Acción:** Verificar primero `select().eq('id', sub).maybeSingle()` y redirigir a `/admin/masters` o `/admin/profile/${sub}/edit` condicionalmente.

---

### 8. Script de limpieza con SERVICE_ROLE_KEY
**Archivo:** `scripts/cleanup-session-images.mjs`

El script es correcto, pero la `SERVICE_ROLE_KEY` debe:
- Vivir solo en secrets de CI, no en `.env` local commiteable.
- Tener políticas restrictivas en Storage (idealmente con RLS que limite `remove()` por prefijo).

---

## 🟡 Medios (Rendimiento/Mantenibilidad)

### 9. `rule.between()` se ejecuta por sesión en cada cambio de filtro
**Archivo:** `app/components/landing/SessionsGrid.vue:73-86`

```ts
const filteredSessions = computed(() =>
  sessions.value
    .filter(matchesFilters)
    ...
)
```

Y `matchesFilters` llama a `rule.between(monthStart, monthEnd, true)` por sesión. Con muchos registros, el navegador se congela en cada keystroke del filtro. No hay `debounce`, ni memoización.

**Acción:**
- Cachear las ocurrencias por sesión con `Map<sessionId, Date[]>` invalidado solo al cambiar el mes.
- O precomputar en el servidor con un endpoint que devuelva `(sessionId, occurrencesInMonth)`.

---

### 10. `rrule.all()` con `count`/`until` pero sin tope duro
**Archivo:** `app/composables/useSessionFormat.ts:65-67`

El check `bounded` está, pero si alguien crea una regla con `COUNT=10000`, `rule.all()` retorna 10k fechas y se serializan en el bundle. Considera capar a 200 ocurrencias.

---

### 11. Duplicación `new.vue` vs `[id]/edit.vue`
**Archivos:**
- `app/pages/admin/sessions/new.vue`
- `app/pages/admin/sessions/[id]/edit.vue`

Lógica idéntica con distinto `sessionId` resuelto. Unifica en una sola ruta que use `useRoute().params.id` o usa `definePageMeta`.

---

### 12. `.output/`, `.nuxt/` commiteados
El `.gitignore` los excluye, pero veo que ya hay un build en el repo. Asegúrate de que nunca se commiteen.

---

### 13. `UFileUpload` con `accept="image/*"` no bloquea SVG
SVG puede contener JavaScript. Si permites SVG, es un vector de XSS cuando se renderiza con `<img src>` en otra página (depende del contexto, pero es un riesgo).

**Acción:** Filtra explícitamente a `accept="image/jpeg,image/png,image/webp"`.

---

### 14. Falta de middleware propio
No tienes un `middleware/admin.ts` que valide no solo "¿estás logueado?" sino "¿tienes permisos reales?". El `redirectOptions` de Supabase es básico.

**Acción:** Crear `app/middleware/admin.ts`:

```ts
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) return navigateTo('/login')
  if (to.path.startsWith('/admin')) {
    const adminStore = useAdminStore()
    await adminStore.refresh()
    // El control fino por ruta (masters vs sessions) se hace por RLS
  }
})
```

---

## 🟢 Bajos (Limpieza/Estilo)

### 15. Tipos de error inseguros
`as Master`, `as GameSession`, `as unknown as GameSessionWithMaster` aparecen en muchos sitios. Si los tipos no coinciden con la realidad del query, los bugs aparecen silenciosamente.

**Acción:** Genera tipos con `supabase gen types typescript` después de cada cambio de schema, y úsalos en selects.

---

### 16. `masters.value = (data ?? []) as Master[]` pero el select no trae `profile`
**Archivo:** `app/pages/admin/masters.vue:48-52`

El select en `loadMasters` solo trae `id,full_name,user_name,phone,avatar_url` y castea a `Master` (que incluye `profile`). El campo `profile` queda como `undefined`, pero como el tipo lo permite, no hay error de TS. Esto rompe la intuición.

---

### 17. `useLazyFetch` sin await en composición inicial
**Archivos:**
- `app/components/admin/MasterForm.vue`
- `app/pages/admin/profile/[id]/edit.vue`

Si en SSR la promesa no se resuelve antes de que la página hidrate, puedes tener un flash de "no hay países" antes de mostrar el select. Considera `await useFetch(...)` o muestra skeleton.

---

### 18. `URL.createObjectURL` sin `URL.revokeObjectURL`
**Archivos:**
- `app/components/admin/MasterForm.vue:104`
- `app/components/admin/SessionForm.vue:177`
- `app/pages/admin/profile/[id]/edit.vue:165`

Cada vez que cambia el archivo, creas un nuevo object URL pero nunca lo liberas. Memory leak menor pero acumulable en SPA.

---

### 19. `console.log` en producción
**Archivos:**
- `app/pages/login.vue:32`
- `app/pages/confirm.vue:16`

`console.log('Submitted', payload)` puede filtrar emails si el usuario los teclea. `console.log('User is not logged in, redirecting...')` en producción es ruido.

---

### 20. CSP permite `https://placehold.co/` e `https://images.unsplash.com/` globalmente
**Archivo:** `nuxt.config.ts:67`

Si algún día subes imágenes de usuario que carguen de URLs arbitrarias, podrían redirigir a un dominio no listado. Considera un proxy propio (`/api/image-proxy?url=...`) que valide host.

---

## ✅ Lo que está bien

- `.env` correctamente excluido de git ✅
- `nuxt-security` configurado con CSP y `strict: false` (razonable para SPA con OAuth) ✅
- Tipos generados de Supabase (`database.types.ts`) y usados en el código ✅
- Manejo de errores en formularios con `toast` consistente ✅
- RRule parsing robusto con try/catch ✅
- Limpieza de avatares/imágenes huérfanos con script dedicado ✅
- `useSupabaseUser` consistente en casi todo el código ✅
- Validación con Zod en formularios ✅

---

## 📋 Prioridades sugeridas

### Inmediato
- [ ] Arreglar el bug de `onSubmit` en `app/pages/login.vue`.
- [ ] Corregir `user.value?.id` → `user.value?.sub` en `app/pages/admin/sessions/index.vue`.

### Esta semana
- [ ] Definir y desplegar **RLS policies** en Supabase para `dagger_masters`, `game_sessions`, `session_players` y `admins`.
- [ ] Validar buckets de Storage con mime types y límites de tamaño.
- [ ] Separar buckets `master-avatars` y `game-session-images`.
- [ ] Validar `max_players` en DB al insertar `session_players`.

### Cuando puedas
- [ ] Middleware de admin propio (`app/middleware/admin.ts`).
- [ ] Rate limiting en reservas (Cloudflare Turnstile / Upstash).
- [ ] Sanitización de inputs (`name`, `description`, `title`).
- [ ] Deduplicar `app/pages/admin/sessions/new.vue` y `app/pages/admin/sessions/[id]/edit.vue`.
- [ ] Memoizar ocurrencias de RRULE en `SessionsGrid`.
- [ ] Cambiar `accept="image/*"` por lista explícita de tipos permitidos.
- [ ] Eliminar `console.log` de producción.
- [ ] Configurar proxy propio para imágenes externas (evitar dominios abiertos en CSP).
- [ ] `URL.revokeObjectURL` en previews de archivos.

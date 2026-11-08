<script setup lang="ts">
import { safeRedirectPath } from '~/utils/url'

const user = useSupabaseUser()
const route = useRoute()
const redirectInfo = useSupabaseCookieRedirect()
const profileStore = useCurrentProfileStore()

// El usuario puede cambiar varias veces en esta pantalla: `onAuthStateChange`
// y el hook `page:start` de Nuxt vuelven a asignar `useSupabaseUser()`.
// Si el watcher se ejecuta de nuevo después de navegar al destino guardado,
// la cookie ya está consumida y el fallback por rol pisaría esa navegación
// (el síntoma: ver el post un instante y acabar en /admin/profile).
// Resolvemos el destino una única vez.
let resolved = false

watch(user, async () => {
  if (resolved) return

  if (!user.value) {
    console.log('User is not logged in, redirecting to login page...')
    return navigateTo('/login', { replace: true })
  }

  resolved = true

  // Preferimos la cookie; el query es un fallback por si el callback de
  // Supabase conserva el parámetro `redirect`.
  const path = redirectInfo.pluck() ?? safeRedirectPath(route.query.redirect)
  if (path) {
    return navigateTo(path, { replace: true })
  }

  await profileStore.refresh()
  const destination = profileStore.master?.role === 'master' ? '/admin/profile' : '/account'
  return navigateTo(destination, { replace: true })
}, { immediate: true })
</script>

<template>
  <div class="flex-1 flex items-center justify-center min-h-[50vh]">
    <UIcon
      name="i-lucide-loader-circle"
      class="w-12 h-12 text-slate-500 animate-spin"
    />
  </div>
</template>

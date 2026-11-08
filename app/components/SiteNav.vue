<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const user = useSupabaseUser()
const route = useRoute()
const currentProfileStore = useCurrentProfileStore()

const accountLabel = computed(() => {
  if (!user.value) return 'Iniciar sesión'
  return currentProfileStore.master?.full_name
    || currentProfileStore.master?.user_name
    || 'Mi cuenta'
})

const accountTo = computed(() => {
  if (!user.value) {
    // Guarda la página actual para volver después del login. Evita un bucle
    // si el propio header se pulsa desde /login o /confirm.
    if (route.path === '/login' || route.path === '/confirm') return '/login'
    return { path: '/login', query: { redirect: route.fullPath } }
  }

  const role = currentProfileStore.master?.role
  if (role === 'master') return `/admin/profile`
  return '/account'
})

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Eventos',
    to: '/events'
  },
  {
    label: 'Blog',
    to: '/blog'
  }
])
</script>

<template>
  <UHeader transparent>
    <template #title>
      <div class="logo-text logo-image inline-flex items-center gap-2 font-display text-xl text-on-surface">
        <img
          src="/logo-dayda.png"
          class="h-8 w-auto"
        >
        <p>Dagas y Dados</p>
      </div>
    </template>

    <template #right>
      <UNavigationMenu
        :items="items"
        class="hidden sm:block"
      />
      <UButton
        :label="accountLabel"
        :to="accountTo"
        color="neutral"
        variant="ghost"
        class="hidden sm:inline-flex"
      />
    </template>

    <template #body>
      <UNavigationMenu
        :items="items"
        orientation="vertical"
        class="-mx-2.5"
      />
      <UButton
        :label="accountLabel"
        :to="accountTo"
        color="neutral"
        variant="ghost"
        class="mt-2"
      />
    </template>
  </UHeader>
</template>

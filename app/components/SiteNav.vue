<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Todas las Mesas',
    to: '/sessions',
    active: route.path.startsWith('/docs/getting-started')
  },
  {
    label: 'Comunidad',
    to: '#comunidad',
    active: route.path.startsWith('/docs/components')
  },
  {
    label: 'Whatsapp',
    to: 'https://chat.whatsapp.com/IbiecwzhrVf7XRqWscTHgO',
    target: '_blank'
  }
])
</script>

<template>
  <UHeader transparent>
    <template #title>
      <div class="logo-text logo-image inline-flex items-center gap-2 font-display text-xl text-on-surface">
        <img
          src="/logo-dayda.png"
          alt="dagas y dados"
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
    </template>

    <template #body>
      <UNavigationMenu
        :items="items"
        orientation="vertical"
        class="-mx-2.5"
      />
    </template>
  </UHeader>
</template>

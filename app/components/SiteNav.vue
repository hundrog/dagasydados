<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const issueForm = ref<{ open: () => void } | null>(null)

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Eventos',
    to: '/events'
  },
  {
    label: 'Administrar',
    to: '/admin/sessions'
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
        icon="i-lucide-bug"
        label="Reportar problema"
        color="neutral"
        variant="soft"
        class="cursor-pointer"
        @click="issueForm?.open()"
      />
      <UButton
        icon="i-simple-icons-whatsapp"
        size="md"
        color="success"
        variant="solid"
        target="_blank"
        to="https://chat.whatsapp.com/IbiecwzhrVf7XRqWscTHgO"
      />
      <UColorModeButton />
    </template>

    <template #body>
      <UNavigationMenu
        :items="items"
        orientation="vertical"
        class="-mx-2.5"
      />
      <UButton
        icon="i-lucide-bug"
        label="Reportar problema"
        color="neutral"
        variant="soft"
        class="cursor-pointer"
        @click="issueForm?.open()"
      />
      <UButton
        icon="i-simple-icons-whatsapp"
        size="md"
        color="success"
        variant="solid"
        target="_blank"
        to="https://chat.whatsapp.com/IbiecwzhrVf7XRqWscTHgO"
      />
      <UColorModeButton />
    </template>
  </UHeader>

  <LandingIssueForm ref="issueForm" />
</template>

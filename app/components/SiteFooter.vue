<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const user = useSupabaseUser()
const issueForm = ref<{ open: () => void } | null>(null)

const items: NavigationMenuItem[] = [
//   {
//     label: 'Figma Kit',
//     to: 'https://go.nuxt.com/figma-ui',
//     target: '_blank'
//   },
//   {
//     label: 'Playground',
//     to: 'https://stackblitz.com/edit/nuxt-ui',
//     target: '_blank'
//   },
//   {
//     label: 'Releases',
//     to: 'https://github.com/nuxt/ui/releases',
//     target: '_blank'
//   }
]
</script>

<template>
  <UFooter
    :ui="{ bottom: 'lg:flex lg:justify-center' }"
    class="mt-12 lg:mt-24"
  >
    <template #bottom>
      <p class="text-muted text-sm mx-auto">
        Copyright © {{ new Date().getFullYear() }}
      </p>
    </template>

    <UNavigationMenu
      :items="items"
      variant="link"
      orientation="vertical"
    />

    <template #right>
      <div class="flex flex-col items-end gap-2">
        <UButton
          v-if="user"
          block
          icon="i-lucide-bug"
          label="Reportar problema"
          color="neutral"
          variant="ghost"
          class="cursor-pointer"
          @click="issueForm?.open()"
        />
        <UButton
          block
          icon="i-simple-icons-whatsapp"
          label="Unete a la comunidad"
          color="success"
          variant="ghost"
          target="_blank"
          to="https://chat.whatsapp.com/IbiecwzhrVf7XRqWscTHgO"
        />
      </div>
    </template>
  </UFooter>

  <LandingIssueForm ref="issueForm" />
</template>

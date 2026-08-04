<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const supabase = useSupabaseClient()
const toast = useToast()
const route = useRoute()

const open = ref(true)

const isSessionEdit = computed(() => /^\/admin\/sessions\/.+\/edit$/.test(route.path))

const formSections = [
  { label: 'Información básica', id: 'informacion-basica' },
  { label: 'Clasificación', id: 'clasificacion' },
  { label: 'Programación', id: 'programacion' },
  { label: 'Logística', id: 'logistica' },
  { label: 'Jugadores', id: 'jugadores' },
  { label: 'Master', id: 'master' }
]

function scrollToSection(id: string) {
  if (!import.meta.client) return

  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Game Sessions',
    icon: 'i-lucide-calendar',
    to: '/admin/sessions',
    active: route.path.startsWith('/admin/sessions'),
    defaultOpen: isSessionEdit.value,
    children: isSessionEdit.value
      ? formSections.map(section => ({
          label: section.label,
          onSelect: () => scrollToSection(section.id)
        }))
      : undefined
  },
  {
    label: 'Dagger Masters',
    icon: 'i-lucide-user',
    to: '/admin/masters',
    active: route.path.startsWith('/admin/masters')
  }
])

async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error signing out:', error.message)
    toast.add({
      title: 'Error',
      description: error.message,
      color: 'error'
    })
  } else {
    navigateTo('/')
  }
}
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="flex flex-1 min-h-0">
      <USidebar
        v-model:open="open"
        collapsible="icon"
        :ui="{
          gap: 'h-[calc(100%-var(--ui-header-height))]',
          container:
            'top-(--ui-header-height) bottom-0 h-[calc(100%-var(--ui-header-height))]'
        }"
      >
        <UNavigationMenu
          :items="items"
          orientation="vertical"
          :ui="{ link: 'p-1.5 overflow-hidden' }"
        />
        <template #footer>
          <div class="flex-1" />
          <UButton
            label="Cerrar sesión"
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            class="w-full justify-start cursor-pointer"
            @click="signOut"
          />
        </template>
      </USidebar>

      <div class="flex-1 p-4 max-w-6xl mx-auto w-full">
        <slot />
      </div>
    </div>
  </div>
</template>

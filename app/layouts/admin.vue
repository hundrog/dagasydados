<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const supabase = useSupabaseClient()
const toast = useToast()
const route = useRoute()
const { isAdmin } = useIsAdmin()
const user = useSupabaseUser()

const open = ref(true)

const isSessionEdit = computed(() => /^\/admin\/sessions\/.+\/edit$/.test(route.path))
const isProfileEdit = computed(() => /^\/admin\/profile\/.+\/edit$/.test(route.path))

const sessionFormSections = [
  { label: 'Información básica', id: 'informacion-basica' },
  { label: 'Clasificación', id: 'clasificacion' },
  { label: 'Programación', id: 'programacion' },
  { label: 'Logística', id: 'logistica' },
  { label: 'Jugadores', id: 'jugadores' },
  { label: 'Master', id: 'master' }
]

const profileFormSections = [
  { label: 'Información del master', id: 'informacion-master' },
  { label: 'Estilo de juego', id: 'estilo-juego' },
  { label: 'Homebrew', id: 'homebrew' },
  { label: 'Referencias', id: 'referencias' }
]

function scrollToSection(id: string) {
  if (!import.meta.client) return

  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const gameSessionsItem = (): NavigationMenuItem => ({
  label: 'Game Sessions',
  icon: 'i-lucide-calendar',
  to: '/admin/sessions',
  active: route.path.startsWith('/admin/sessions'),
  defaultOpen: isSessionEdit.value,
  children: isSessionEdit.value
    ? sessionFormSections.map(section => ({
        label: section.label,
        onSelect: () => scrollToSection(section.id)
      }))
    : undefined
})

const mastersItem = (): NavigationMenuItem => ({
  label: 'Dagger Masters',
  icon: 'i-lucide-user',
  to: '/admin/masters',
  active: route.path.startsWith('/admin/masters') || isProfileEdit.value,
  defaultOpen: isProfileEdit.value,
  children: isProfileEdit.value
    ? profileFormSections.map(section => ({
        label: section.label,
        onSelect: () => scrollToSection(section.id)
      }))
    : undefined
})

const profileItem = (): NavigationMenuItem => ({
  label: 'Perfil',
  icon: 'i-lucide-user',
  to: `/admin/profile/${user.value?.sub}/edit`,
  active: isProfileEdit.value,
  defaultOpen: isProfileEdit.value,
  children: isProfileEdit.value
    ? profileFormSections.map(section => ({
        label: section.label,
        onSelect: () => scrollToSection(section.id)
      }))
    : undefined
})

const items = computed<NavigationMenuItem[]>(() => {
  if (isAdmin.value) {
    return [mastersItem(), gameSessionsItem()]
  }

  return [profileItem(), gameSessionsItem()]
})

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

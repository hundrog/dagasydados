<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'
import { useMediaQuery } from '@vueuse/core'

const supabase = useSupabaseClient()
const toast = useToast()
const route = useRoute()
const { isAdmin } = storeToRefs(useAdminStore())
const user = useSupabaseUser()
const currentMasterStore = useCurrentMasterStore()
const { master } = storeToRefs(currentMasterStore)
const colorMode = useColorMode()

const isMobile = useMediaQuery('(max-width: 1023px)')

const open = ref(true)

const currentMasterName = computed(() =>
  master.value?.full_name
  || master.value?.user_name
  || user.value?.user_metadata?.name
  || user.value?.email
  || 'Perfil'
)

const currentMasterInitials = computed(() => {
  const value = master.value?.full_name || master.value?.user_name
  if (!value) return 'P'

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || 'P'
})

watch(
  () => route.fullPath,
  () => {
    void currentMasterStore.refresh()
    if (isMobile.value) {
      open.value = false
    }
  }
)

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

const userItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Profile',
      icon: 'i-lucide-user',
      to: `/admin/profile/${user.value?.sub}/edit`
    }
  ],
  [
    {
      label: 'Appearance',
      icon: 'i-lucide-sun-moon',
      children: [
        {
          label: 'Light',
          icon: 'i-lucide-sun',
          type: 'checkbox',
          checked: colorMode.value === 'light',
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.preference = 'light'
            }
          },
          onSelect(e: Event) {
            e.preventDefault()
          }
        },
        {
          label: 'Dark',
          icon: 'i-lucide-moon',
          type: 'checkbox',
          checked: colorMode.value === 'dark',
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.preference = 'dark'
            }
          },
          onSelect(e: Event) {
            e.preventDefault()
          }
        }
      ]
    }
  ],
  [
    {
      label: 'Log out',
      icon: 'i-lucide-log-out',
      onSelect: signOut
    }
  ]
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
    <div class="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 lg:hidden">
      <UButton
        :icon="open ? 'i-lucide-x' : 'i-lucide-panel-right-open'"
        color="neutral"
        variant="ghost"
        square
        :aria-label="open ? 'Cerrar menú' : 'Abrir menú'"
        @click="open = !open"
      />
    </div>
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
          <UDropdownMenu
            :items="userItems"
            :content="{ align: 'center', collisionPadding: 12 }"
            :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
          >
            <UButton
              :avatar="{
                src: master?.avatar_url ?? undefined,
                text: currentMasterInitials,
                alt: currentMasterName
              }"
              :label="currentMasterName"
              trailing-icon="i-lucide-chevrons-up-down"
              color="neutral"
              variant="ghost"
              square
              class="w-full data-[state=open]:bg-elevated overflow-hidden"
              :ui="{
                trailingIcon: 'text-dimmed ms-auto'
              }"
            />
          </UDropdownMenu>
        </template>
      </USidebar>

      <div class="flex-1 p-4 max-w-6xl mx-auto w-full">
        <slot />
      </div>
    </div>
  </div>
</template>

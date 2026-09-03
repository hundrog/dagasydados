<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useClipboard } from '@vueuse/core'
import type { Row } from '@tanstack/vue-table'
import type { GameSessionWithMaster } from '~/types/session'

const supabase = useSupabaseClient()
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UBadge = resolveComponent('UBadge')

const toast = useToast()
const { copy } = useClipboard()
const adminStore = useAdminStore()
const { isAdmin } = storeToRefs(adminStore)
const currentMasterStore = useCurrentMasterStore()
const { isAuthorized } = storeToRefs(currentMasterStore)
const user = useSupabaseUser()
const { deleteSessionImageByUrl } = useSessionImage()

const canCreate = computed(() => isAdmin.value || isAuthorized.value)

const canModify = (session: GameSessionWithMaster) => isAdmin.value || session.master_id === user.value?.sub

const sessions = ref<GameSessionWithMaster[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const pendingDelete = ref<GameSessionWithMaster | null>(null)
const isDeleteOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (value: boolean) => {
    if (!value) pendingDelete.value = null
  }
})
const isDeleting = ref(false)

const lookupsStore = useLookupsStore()
const { lookups } = storeToRefs(lookupsStore)

const currentMonthValue = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(currentMonthValue())
const selectedWeekday = ref<number | 'all'>('all')
const selectedMode = ref<string>('all')
const selectedSessionType = ref<string>('all')

const monthOptions = computed(() => {
  const now = new Date()
  const options: Array<{ label: string, value: string }> = []
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    options.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    })
  }
  return options
})

const weekdayOptions: Array<{ label: string, value: number | 'all' }> = [
  { label: 'Todos los días', value: 'all' },
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
  { label: 'Domingo', value: 0 }
]

const modeOptions = computed(() => [
  { label: 'Todas las modalidades', value: 'all' },
  ...(lookups.value?.modes ?? [])
])

const sessionTypeOptions = computed(() => [
  { label: 'Todos los tipos', value: 'all' },
  ...(lookups.value?.session_types ?? []).map(type => ({ label: type, value: type }))
])

const monthStart = computed(() => {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  return new Date(Number(year), Number(month) - 1, 1)
})

const monthEnd = computed(() => {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  return new Date(Number(year), Number(month), 0, 23, 59, 59, 999)
})

const occurrencesInMonth = (session: GameSessionWithMaster): Date[] => {
  const start = parseLocalDate(session.fecha_inicio)
  if (!start) return []

  const isInMonth = start >= monthStart.value && start <= monthEnd.value
  if (!session.rrule) {
    return isInMonth ? [start] : []
  }

  const rule = parseSessionRule(session.rrule, start)
  if (!rule) {
    return isInMonth ? [start] : []
  }

  return rule.between(monthStart.value, monthEnd.value, true)
}

const matchesFilters = (session: GameSessionWithMaster) => {
  const occurrences = occurrencesInMonth(session)
  if (occurrences.length === 0) return false

  if (selectedWeekday.value !== 'all' && !occurrences.some(o => o.getDay() === selectedWeekday.value)) {
    return false
  }

  if (selectedMode.value !== 'all' && session.mode !== selectedMode.value) {
    return false
  }

  if (selectedSessionType.value !== 'all' && session.session_type?.trim() !== selectedSessionType.value) {
    return false
  }

  return true
}

const filteredSessions = computed(() =>
  sessions.value
    .filter(matchesFilters)
    .sort((a, b) => (parseLocalDate(a.fecha_inicio)?.getTime() ?? 0) - (parseLocalDate(b.fecha_inicio)?.getTime() ?? 0))
)

const hasActiveFilters = computed(() =>
  selectedMonth.value !== currentMonthValue()
  || selectedWeekday.value !== 'all'
  || selectedMode.value !== 'all'
  || selectedSessionType.value !== 'all'
)

const loadSessions = async () => {
  isLoading.value = true
  errorMessage.value = null

  let query = supabase
    .from('game_sessions')
    .select('id,title,system,session_type,mode,rrule,master_id,fecha_inicio,hora_inicio,hora_fin,image_url,status,master:dagger_masters(id,full_name,user_name,avatar_url,phone)')

  if (!isAdmin.value) {
    query = query.eq('master_id', user.value?.sub ?? '__no_session__')
  }

  const { data, error } = await query

  if (error) {
    errorMessage.value = error.message
  } else {
    sessions.value = (data ?? []) as unknown as GameSessionWithMaster[]
  }

  isLoading.value = false
}

onMounted(async () => {
  await adminStore.refresh()
  await currentMasterStore.refresh()
  await lookupsStore.refresh()
  await loadSessions()
})

const confirmDelete = async () => {
  if (!pendingDelete.value || isDeleting.value) return

  isDeleting.value = true

  await deleteSessionImageByUrl(pendingDelete.value.image_url)

  const { error } = await supabase
    .from('game_sessions')
    .delete()
    .eq('id', pendingDelete.value.id)

  isDeleting.value = false

  if (error) {
    toast.add({
      title: 'No se pudo borrar la sesión',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-octagon-x'
    })
    return
  }

  toast.add({
    title: 'Sesión borrada',
    color: 'success',
    icon: 'i-lucide-trash-2'
  })

  pendingDelete.value = null
  await loadSessions()
}

const goToCreate = () => {
  navigateTo('/admin/sessions/new')
}

const goToEdit = (id: string) => {
  navigateTo(`/admin/sessions/${id}/edit`)
}

const columns: TableColumn<GameSessionWithMaster>[] = [
  {
    accessorKey: 'title',
    header: 'Title'
  },
  {
    id: 'master',
    header: 'Master',
    cell: ({ row }) => row.original.master?.full_name || '-'
  },
  {
    accessorKey: 'system',
    header: 'System'
  },
  {
    accessorKey: 'session_type',
    header: 'Session Type'
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const isDraft = row.original.status === 'draft'
      return h(
        UBadge,
        {
          color: isDraft ? 'neutral' : 'primary',
          variant: 'subtle'
        },
        () => isDraft ? 'Borrador' : 'Publicada'
      )
    }
  },
  {
    accessorKey: 'fecha_inicio',
    header: 'Fecha inicio',
    cell: ({ row }) => {
      const value = row.getValue('fecha_inicio') as string | null
      if (!value) return '-'
      const date = parseLocalDate(value)
      if (!date) return '-'
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  },
  {
    id: 'horario',
    header: 'Horario',
    cell: ({ row }) => {
      const start = row.original.hora_inicio
      const end = row.original.hora_fin || ''
      const formatTime = (time: string) => {
        const parsed = new Date(time)
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
        const fallback = time.slice(0, 5)
        return fallback || time
      }

      if (!start && !end) return '-'
      if (!start) return formatTime(end)
      if (!end) return formatTime(start)
      return `${formatTime(start)} - ${formatTime(end)}`
    }
  },
  {
    id: 'actions',
    meta: {
      class: {
        td: 'text-right'
      }
    },
    cell: ({ row }) => {
      return h(
        UDropdownMenu,
        {
          'content': {
            align: 'end'
          },
          'items': getRowItems(row),
          'aria-label': 'Actions dropdown'
        },
        () =>
          h(UButton, {
            'icon': 'i-lucide-ellipsis-vertical',
            'color': 'neutral',
            'variant': 'ghost',
            'aria-label': 'Actions dropdown'
          })
      )
    }
  }
]

function getRowItems(row: Row<GameSessionWithMaster>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Ver sesión',
      onSelect() {
        navigateTo(`/sessions/${row.original.id}`)
      }
    },
    {
      label: 'Copiar ID',
      onSelect() {
        copy(row.original.id)

        toast.add({
          title: 'ID copiado al portapapeles!',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    },
    {
      label: 'Copiar título',
      onSelect() {
        copy(row.original.title)

        toast.add({
          title: 'Título copiado al portapapeles!',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Editar sesión',
      disabled: !canModify(row.original),
      onSelect() {
        goToEdit(row.original.id)
      }
    },
    {
      label: 'Borrar sesión',
      color: 'danger',
      disabled: !canModify(row.original),
      onSelect() {
        pendingDelete.value = row.original
      }
    }
  ]
}
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="justify-end flex my-8">
      <template v-if="canCreate">
        <UButton
          label="Nueva Sesión"
          icon="i-heroicons-plus"
          class="cursor-pointer"
          @click="goToCreate"
        />
      </template>
      <UAlert
        v-else
        color="warning"
        variant="subtle"
        title="Cuenta sin autorizar"
        description="Solo los masters autorizados pueden crear campañas. Solicita autorización desde tu perfil."
        icon="i-lucide-shield-alert"
        class="w-full"
      >
        <template #actions>
          <div class="w-full flex justify-end">
            <UButton
              label="Ir a mi perfil"
              icon="i-lucide-user"
              class="cursor-pointer"
              :to="`/admin/profile/${user?.sub}/edit`"
            />
          </div>
        </template>
      </UAlert>
    </div>
    <div
      v-if="isLoading"
      class="p-4 text-sm text-slate-500"
    >
      Cargando sesiones...
    </div>
    <div
      v-else-if="errorMessage"
      class="p-4 text-sm text-red-600"
    >
      {{ errorMessage }}
    </div>
    <template v-else>
      <div class="card p-4 mb-6 flex flex-wrap items-end gap-4 justify-around">
        <div class="flex flex-col gap-1.5">
          <span class="label-metadata text-on-surface-dim">
            Mes
          </span>
          <USelectMenu
            v-model="selectedMonth"
            :items="monthOptions"
            value-key="value"
            leading-icon="i-lucide-calendar-days"
            class="w-44"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="label-metadata text-on-surface-dim">
            Día de la semana
          </span>
          <USelectMenu
            v-model="selectedWeekday"
            :items="weekdayOptions"
            value-key="value"
            leading-icon="i-lucide-calendar"
            class="w-52"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="label-metadata text-on-surface-dim">
            Modalidad
          </span>
          <USelectMenu
            v-model="selectedMode"
            :items="modeOptions"
            value-key="value"
            leading-icon="i-lucide-gamepad-2"
            class="w-52"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="label-metadata text-on-surface-dim">
            Tipo de sesión
          </span>
          <USelectMenu
            v-model="selectedSessionType"
            :items="sessionTypeOptions"
            value-key="value"
            leading-icon="i-lucide-swords"
            class="w-52"
          />
        </div>

        <UButton
          v-if="hasActiveFilters"
          label="Limpiar filtros"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          class="cursor-pointer"
          @click="selectedMonth = currentMonthValue(); selectedWeekday = 'all'; selectedMode = 'all'; selectedSessionType = 'all'"
        />
      </div>
      <UTable
        :data="filteredSessions"
        :columns="columns"
        class="flex-1"
      />
    </template>

    <UModal
      v-model:open="isDeleteOpen"
      title="Borrar sesión"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-slate-600">
            ¿Borrar la sesión
            <span class="font-semibold text-primary-900">
              {{ pendingDelete?.title || 'esta sesión' }}
            </span>?
            Esta acción no se puede deshacer.
          </p>

          <div class="flex justify-end gap-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="ghost"
              class="cursor-pointer"
              :disabled="isDeleting"
              @click="pendingDelete = null"
            />
            <UButton
              label="Borrar"
              color="error"
              class="cursor-pointer"
              :loading="isDeleting"
              @click="confirmDelete"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

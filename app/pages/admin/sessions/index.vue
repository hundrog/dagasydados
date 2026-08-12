<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useClipboard } from '@vueuse/core'
import type { Row } from '@tanstack/vue-table'
import type { GameSessionWithMaster } from '~/types/session'

const supabase = useSupabaseClient()
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()
const { copy } = useClipboard()
const { isAdmin } = storeToRefs(useAdminStore())
const user = useSupabaseUser()
const { deleteSessionImageByUrl } = useSessionImage()

const canModify = (session: GameSessionWithMaster) => isAdmin.value || session.master_id === user.value?.id

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

const loadSessions = async () => {
  isLoading.value = true
  errorMessage.value = null

  const { data, error } = await supabase
    .from('game_sessions')
    .select('id,title,system,session_type,fecha_inicio,hora_inicio,hora_fin,image_url,master:dagger_masters(id,full_name,user_name,avatar_url,phone)')

  if (error) {
    errorMessage.value = error.message
  } else {
    sessions.value = (data ?? []) as unknown as GameSessionWithMaster[]
  }

  isLoading.value = false
}

onMounted(() => {
  loadSessions()
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
      <UButton
        label="Nueva Sesión"
        icon="i-heroicons-plus"
        class="cursor-pointer"
        @click="goToCreate"
      />
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
    <UTable
      v-else
      :data="sessions"
      :columns="columns"
      class="flex-1"
    />

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

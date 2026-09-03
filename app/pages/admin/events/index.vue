<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useClipboard } from '@vueuse/core'
import type { Row } from '@tanstack/vue-table'
import type { Event } from '~/types/event'
import { useEventImage } from '~/composables/useEventImage'

const supabase = useSupabaseClient()
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const toast = useToast()
const { copy } = useClipboard()
const adminStore = useAdminStore()
const { isAdmin } = storeToRefs(adminStore)
const { deleteEventImageByUrl } = useEventImage()

if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: 'Acceso denegado' })
}

const events = ref<Event[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const pendingDelete = ref<Event | null>(null)
const isDeleteOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (value: boolean) => {
    if (!value) pendingDelete.value = null
  }
})
const isDeleting = ref(false)

const loadEvents = async () => {
  isLoading.value = true
  errorMessage.value = null

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_datetime', { ascending: false })

  if (error) {
    errorMessage.value = error.message
  } else {
    events.value = (data ?? []) as Event[]
  }

  isLoading.value = false
}

onMounted(async () => {
  await adminStore.refresh()
  await loadEvents()
})

const confirmDelete = async () => {
  if (!pendingDelete.value || isDeleting.value) return

  isDeleting.value = true

  await deleteEventImageByUrl(pendingDelete.value.image_url)

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', pendingDelete.value.id)

  isDeleting.value = false

  if (error) {
    toast.add({
      title: 'No se pudo borrar el evento',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-octagon-x'
    })
    return
  }

  toast.add({
    title: 'Evento borrado',
    color: 'success',
    icon: 'i-lucide-trash-2'
  })

  pendingDelete.value = null
  await loadEvents()
}

const goToCreate = () => {
  navigateTo('/admin/events/new')
}

const goToEdit = (id: string) => {
  navigateTo(`/admin/events/${id}/edit`)
}

const formatDatetime = (value: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const columns: TableColumn<Event>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre'
  },
  {
    id: 'start',
    header: 'Inicio',
    cell: ({ row }) => formatDatetime(row.original.start_datetime)
  },
  {
    id: 'end',
    header: 'Fin',
    cell: ({ row }) => formatDatetime(row.original.end_datetime)
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

function getRowItems(row: Row<Event>) {
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
      type: 'separator'
    },
    {
      label: 'Editar evento',
      onSelect() {
        goToEdit(row.original.id)
      }
    },
    {
      label: 'Borrar evento',
      color: 'danger',
      onSelect() {
        pendingDelete.value = row.original
      }
    }
  ]
}
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-primary-900">
          Eventos
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Agrupa múltiples mesas bajo un mismo evento.
        </p>
      </div>
      <UButton
        label="Nuevo Evento"
        icon="i-lucide-plus"
        class="cursor-pointer"
        @click="goToCreate"
      />
    </div>

    <div
      v-if="isLoading"
      class="p-4 text-sm text-slate-500"
    >
      Cargando eventos...
    </div>
    <div
      v-else-if="errorMessage"
      class="p-4 text-sm text-red-600"
    >
      {{ errorMessage }}
    </div>
    <UTable
      v-else
      :data="events"
      :columns="columns"
      class="flex-1"
    />

    <UModal
      v-model:open="isDeleteOpen"
      title="Borrar evento"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-slate-600">
            ¿Borrar el evento
            <span class="font-semibold text-primary-900">
              {{ pendingDelete?.name || 'este evento' }}
            </span>?
            Las mesas asociadas no se borrarán, solo se desvincularán del evento.
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

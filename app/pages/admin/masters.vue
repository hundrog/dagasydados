<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useClipboard } from '@vueuse/core'
import type { Row } from '@tanstack/vue-table'
import type { Master, MasterStatus } from '~/types/master'
import type MasterForm from '~/components/admin/MasterForm.vue'

const supabase = useSupabaseClient()
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UBadge = resolveComponent('UBadge')

const toast = useToast()
const { copy } = useClipboard()
const { isAdmin } = storeToRefs(useAdminStore())
const user = useSupabaseUser()

const canModify = (master: Master) => isAdmin.value || master.id === user.value?.sub

const masterStatusMeta: Record<MasterStatus, { label: string, description: string, color: 'neutral' | 'warning' | 'success' | 'danger' }> = {
  created: { label: 'Sin autorizar', description: 'El master aún no ha solicitado autorización.', color: 'neutral' },
  pending: { label: 'Solicitud pendiente', description: 'El master pidió autorización y está en espera de aprobación.', color: 'warning' },
  authorized: { label: 'Autorizado', description: 'El master puede crear campañas y ser elegido como master.', color: 'success' },
  rejected: { label: 'Rechazado', description: 'El master fue rechazado/bloqueado. No puede volver a solicitar autorización.', color: 'danger' }
}

const masters = ref<Master[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const masterFormRef = ref<InstanceType<typeof MasterForm> | null>(null)
const pendingDelete = ref<Master | null>(null)
const isDeleteOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (value: boolean) => {
    if (!value) pendingDelete.value = null
  }
})
const isDeleting = ref(false)

const getInitials = (value: string | null) => {
  if (!value) return 'M'

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || 'M'
}

const loadMasters = async () => {
  isLoading.value = true
  errorMessage.value = null

  const { data, error } = await supabase
    .from('dagger_masters')
    .select('id,full_name,user_name,phone,avatar_url,status')

  if (error) {
    errorMessage.value = error.message
  } else {
    masters.value = (data ?? []) as Master[]
  }

  isLoading.value = false
}

const setMasterStatus = async (master: Master, status: MasterStatus) => {
  const { error } = await supabase
    .from('dagger_masters')
    .update({ status })
    .eq('id', master.id)

  if (error) {
    toast.add({
      title: 'No se pudo actualizar el estado del master',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-octagon-x'
    })
    return
  }

  const messages: Record<MasterStatus, { title: string, description: string }> = {
    authorized: { title: 'Master autorizado', description: 'Ya puede crear campañas y ser elegido como master.' },
    rejected: { title: 'Master rechazado', description: 'Quedó bloqueado y no puede volver a solicitar autorización.' },
    created: { title: 'Master desbloqueado', description: 'Puede volver a solicitar autorización si lo desea.' },
    pending: { title: 'Estado actualizado', description: 'El estado del master se actualizó correctamente.' }
  }

  toast.add({
    title: messages[status].title,
    description: messages[status].description,
    color: 'success',
    icon: 'i-lucide-circle-check'
  })

  await loadMasters()
}

onMounted(() => {
  loadMasters()
})

const confirmDelete = async () => {
  if (!pendingDelete.value || isDeleting.value) return

  isDeleting.value = true

  const { error } = await supabase
    .from('dagger_masters')
    .delete()
    .eq('id', pendingDelete.value.id)

  isDeleting.value = false

  if (error) {
    toast.add({
      title: 'No se pudo borrar el master',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-octagon-x'
    })
    return
  }

  toast.add({
    title: 'Master borrado',
    color: 'success',
    icon: 'i-lucide-trash-2'
  })

  pendingDelete.value = null
  await loadMasters()
}

const columns: TableColumn<Master>[] = [
  {
    accessorKey: 'full_name',
    header: 'Nombre',
    cell: ({ row }) => row.original.full_name || '-'
  },
  {
    accessorKey: 'user_name',
    header: 'Apodo',
    cell: ({ row }) => row.original.user_name || '-'
  },
  {
    accessorKey: 'phone',
    header: 'Teléfono',
    cell: ({ row }) => row.original.phone || '-'
  },
  {
    id: 'avatar',
    header: 'Avatar',
    cell: ({ row }) => {
      const avatarUrl = row.original.avatar_url
      const displayName = row.original.full_name || row.original.user_name || 'Master'
      const initials = getInitials(displayName)

      return h('div', { class: 'flex items-center justify-center' }, [
        avatarUrl
          ? h('img', {
              src: avatarUrl,
              alt: displayName,
              class: 'h-10 w-10 rounded-full object-cover border border-slate-200'
            })
          : h('div', {
              class: 'flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600'
            }, initials)
      ])
    }
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const meta = masterStatusMeta[row.original.status]
      return h(
        UBadge,
        {
          color: meta.color,
          variant: 'subtle',
          label: meta.label
        }
      )
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

function getRowItems(row: Row<Master>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Copiar teléfono',
      onSelect() {
        copy(row.original.phone || '')

        toast.add({
          title: 'Teléfono copiado al portapapeles!',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Autorizar master',
      icon: 'i-lucide-shield-check',
      color: 'primary',
      disabled: !isAdmin.value || row.original.status === 'authorized',
      onSelect() {
        setMasterStatus(row.original, 'authorized')
      }
    },
    {
      label: row.original.status === 'rejected' ? 'Desbloquear master' : 'Rechazar/suspender master',
      icon: row.original.status === 'rejected' ? 'i-lucide-shield' : 'i-lucide-shield-x',
      color: 'danger',
      disabled: !isAdmin.value || row.original.status === 'authorized',
      onSelect() {
        setMasterStatus(row.original, row.original.status === 'rejected' ? 'created' : 'rejected')
      }
    },
    {
      label: 'Desautorizar master',
      icon: 'i-lucide-shield-ban',
      color: 'danger',
      disabled: !isAdmin.value || row.original.status !== 'authorized',
      onSelect() {
        setMasterStatus(row.original, 'created')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Editar perfil',
      disabled: !canModify(row.original),
      onSelect() {
        navigateTo(`/admin/profile/${row.original.id}/edit`)
      }
    },
    {
      label: 'Borrar master',
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
    <div class="flex justify-end my-8">
      <AdminMasterForm
        ref="masterFormRef"
        @saved="loadMasters"
      />
    </div>

    <div
      v-if="isLoading"
      class="p-4 text-sm text-slate-500"
    >
      Cargando masters...
    </div>
    <div
      v-else-if="errorMessage"
      class="p-4 text-sm text-red-600"
    >
      {{ errorMessage }}
    </div>
    <UTable
      v-else
      :data="masters"
      :columns="columns"
      class="flex-1"
    />

    <UModal
      v-model:open="isDeleteOpen"
      title="Borrar master"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-slate-600">
            ¿Borrar a
            <span class="font-semibold text-primary-900">
              {{ pendingDelete?.full_name || pendingDelete?.user_name || 'este master' }}
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

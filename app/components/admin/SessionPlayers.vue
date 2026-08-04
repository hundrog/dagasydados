<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import * as z from 'zod'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/vue-table'
import type { SessionPlayer } from '~/types/session'

const supabase = useSupabaseClient()
const toast = useToast()
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const props = defineProps<{
  sessionId: string
}>()

const players = ref<SessionPlayer[]>([])
const isLoadingPlayers = ref(false)
const playersError = ref<string | null>(null)

const loadPlayers = async () => {
  isLoadingPlayers.value = true
  playersError.value = null

  const { data, error } = await supabase
    .from('session_players')
    .select('*')
    .eq('game_session_id', props.sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    playersError.value = error.message
  } else {
    players.value = (data ?? []) as SessionPlayer[]
  }

  isLoadingPlayers.value = false
}

onMounted(() => {
  loadPlayers()
})

const playerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  telefono: z.string().min(1, 'El teléfono es obligatorio')
})

type PlayerSchema = z.infer<typeof playerSchema>

const playerFormOpen = ref(false)
const isSavingPlayer = ref(false)
const playerFormError = ref<string | null>(null)
const editingPlayer = ref<SessionPlayer | null>(null)
const playerFormState = reactive<PlayerSchema>({
  nombre: '',
  telefono: ''
})

const openPlayerForm = (player?: SessionPlayer) => {
  editingPlayer.value = player ?? null
  playerFormState.nombre = player?.nombre ?? ''
  playerFormState.telefono = player?.telefono ?? ''
  playerFormError.value = null
  playerFormOpen.value = true
}

const savePlayer = async () => {
  if (isSavingPlayer.value) return

  isSavingPlayer.value = true
  playerFormError.value = null

  const payload = {
    game_session_id: props.sessionId,
    nombre: playerFormState.nombre.trim(),
    telefono: playerFormState.telefono.trim()
  }

  const handlePlayerError = (error: { code?: string, message: string }) => {
    playerFormError.value = error.code === '23505'
      ? 'Este teléfono ya está registrado para esta sesión.'
      : error.message
  }

  if (editingPlayer.value) {
    const { error } = await supabase
      .from('session_players')
      .update({ nombre: payload.nombre, telefono: payload.telefono })
      .eq('id', editingPlayer.value.id)

    isSavingPlayer.value = false

    if (error) {
      handlePlayerError(error)
      return
    }
  } else {
    const { error } = await supabase
      .from('session_players')
      .insert(payload)

    isSavingPlayer.value = false

    if (error) {
      handlePlayerError(error)
      return
    }
  }

  playerFormOpen.value = false

  toast.add({
    title: editingPlayer.value ? 'Jugador actualizado' : 'Jugador agregado',
    color: 'success',
    icon: 'i-lucide-circle-check'
  })

  await loadPlayers()
}

const pendingDeletePlayer = ref<SessionPlayer | null>(null)
const isDeletePlayerOpen = computed({
  get: () => pendingDeletePlayer.value !== null,
  set: (value: boolean) => {
    if (!value) pendingDeletePlayer.value = null
  }
})
const isDeletingPlayer = ref(false)

const confirmDeletePlayer = async () => {
  if (!pendingDeletePlayer.value || isDeletingPlayer.value) return

  isDeletingPlayer.value = true

  const { error } = await supabase
    .from('session_players')
    .delete()
    .eq('id', pendingDeletePlayer.value.id)

  isDeletingPlayer.value = false

  if (error) {
    toast.add({
      title: 'No se pudo borrar el jugador',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-octagon-x'
    })
    return
  }

  toast.add({
    title: 'Jugador borrado',
    color: 'success',
    icon: 'i-lucide-trash-2'
  })

  pendingDeletePlayer.value = null
  await loadPlayers()
}

const playerColumns: TableColumn<SessionPlayer>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    cell: ({ row }) => row.original.nombre || '-'
  },
  {
    accessorKey: 'telefono',
    header: 'Teléfono',
    cell: ({ row }) => row.original.telefono || '-'
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
          'items': getPlayerRowItems(row),
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

function getPlayerRowItems(row: Row<SessionPlayer>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Editar jugador',
      onSelect() {
        openPlayerForm(row.original)
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Borrar jugador',
      color: 'danger',
      onSelect() {
        pendingDeletePlayer.value = row.original
      }
    }
  ]
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-primary-900">
        Jugadores inscritos
      </h2>
      <UButton
        label="Nuevo Jugador"
        icon="i-heroicons-plus"
        size="sm"
        class="cursor-pointer"
        @click="openPlayerForm()"
      />
    </div>

    <div
      v-if="isLoadingPlayers"
      class="p-4 text-sm text-slate-500"
    >
      Cargando jugadores...
    </div>
    <div
      v-else-if="playersError"
      class="p-4 text-sm text-red-600"
    >
      {{ playersError }}
    </div>
    <UTable
      v-else
      :data="players"
      :columns="playerColumns"
    />
  </section>

  <UModal
    v-model:open="playerFormOpen"
    :title="editingPlayer ? 'Editar jugador' : 'Nuevo jugador'"
  >
    <template #body>
      <UForm
        :schema="playerSchema"
        :state="playerFormState"
        class="w-full space-y-4"
        @submit="savePlayer"
      >
        <UFormField
          label="Nombre o apodo"
          name="nombre"
          required
        >
          <UInput
            v-model="playerFormState.nombre"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Teléfono"
          name="telefono"
          required
        >
          <UInput
            v-model="playerFormState.telefono"
            class="w-full"
          />
        </UFormField>

        <p
          v-if="playerFormError"
          class="text-sm text-red-600"
        >
          {{ playerFormError }}
        </p>

        <UButton
          type="submit"
          block
          :loading="isSavingPlayer"
          class="cursor-pointer"
        >
          {{ editingPlayer ? 'Actualizar Jugador' : 'Guardar Jugador' }}
        </UButton>
      </UForm>
    </template>
  </UModal>

  <UModal
    v-model:open="isDeletePlayerOpen"
    title="Borrar jugador"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-slate-600">
          ¿Borrar a
          <span class="font-semibold text-primary-900">
            {{ pendingDeletePlayer?.nombre || 'este jugador' }}
          </span>?
          Esta acción no se puede deshacer.
        </p>

        <div class="flex justify-end gap-2">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="ghost"
            class="cursor-pointer"
            :disabled="isDeletingPlayer"
            @click="pendingDeletePlayer = null"
          />
          <UButton
            label="Borrar"
            color="error"
            class="cursor-pointer"
            :loading="isDeletingPlayer"
            @click="confirmDeletePlayer"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

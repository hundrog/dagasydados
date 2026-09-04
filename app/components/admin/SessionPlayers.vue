<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
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
  id?: string
  hideAnonymous?: boolean
}>()

const players = ref<SessionPlayer[]>([])
const isLoadingPlayers = ref(false)
const playersError = ref<string | null>(null)

const anonymousCount = ref(0)
const isUpdatingAnonymous = ref(false)

const loadAnonymousCount = async () => {
  const { data } = await supabase
    .from('game_sessions')
    .select('anonymous_players, max_players')
    .eq('id', props.sessionId)
    .maybeSingle()

  anonymousCount.value = data?.anonymous_players ?? 0
  maxPlayers.value = data?.max_players ?? null
}

const maxPlayers = ref<number | null>(null)

const anonymousPlayerOptions = computed(() => {
  const limit = Number.isFinite(maxPlayers.value) && (maxPlayers.value ?? 0) > 0
    ? Number(maxPlayers.value)
    : 0
  const options = Array.from({ length: limit + 1 }, (_, i) => ({
    label: String(i),
    value: i
  }))
  const current = anonymousCount.value
  if (current > limit && !options.some(o => o.value === current)) {
    options.push({ label: String(current), value: current })
  }
  return options
})

const onAnonymousChange = (value: unknown) => {
  const item = value as { value: number } | null
  const next = item ? Number(item.value) : 0
  if (next < 0) return
  adjustAnonymous(next - anonymousCount.value)
}

const adjustAnonymous = async (delta: number) => {
  if (isUpdatingAnonymous.value) return
  isUpdatingAnonymous.value = true

  const next = anonymousCount.value + delta
  if (next < 0) {
    isUpdatingAnonymous.value = false
    return
  }

  const { error } = await supabase
    .from('game_sessions')
    .update({ anonymous_players: next })
    .eq('id', props.sessionId)

  if (!error) {
    anonymousCount.value = next
  } else {
    playersError.value = error.message
  }

  isUpdatingAnonymous.value = false
}

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
  loadAnonymousCount()
})

const playerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  telefono: z.string().min(1, 'El teléfono es obligatorio').trim().optional()
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
  playerFormState.telefono = ''
  playerFormError.value = null
  playerFormOpen.value = true
}

const savePlayer = async () => {
  if (isSavingPlayer.value) return

  isSavingPlayer.value = true
  playerFormError.value = null

  if (editingPlayer.value) {
    const { error } = await supabase
      .from('session_players')
      .update({ nombre: playerFormState.nombre.trim() })
      .eq('id', editingPlayer.value.id)

    isSavingPlayer.value = false

    if (error) {
      playerFormError.value = error.message
      return
    }
  } else {
    const telefono = playerFormState.telefono?.trim()
    if (!telefono) {
      isSavingPlayer.value = false
      playerFormError.value = 'El teléfono es obligatorio'
      return
    }

    const { data: result, error } = await supabase
      .rpc('create_session_player', {
        p_game_session_id: props.sessionId,
        p_nombre: playerFormState.nombre.trim(),
        p_telefono: telefono
      })

    isSavingPlayer.value = false

    const outcome = result as unknown as { ok: boolean, error?: string, message?: string } | null
    if (error) {
      playerFormError.value = error.message
      return
    }
    if (outcome && !outcome.ok) {
      playerFormError.value = outcome.error === 'duplicate'
        ? 'Este teléfono ya está registrado para esta sesión.'
        : (outcome.message ?? 'No se pudo agregar el jugador.')
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
  <section
    :id="props.id"
    class="space-y-4 scroll-mt-24"
  >
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
      v-if="!hideAnonymous"
      class="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <UFormField
        label="Jugadores anónimos"
        name="anonymous_players"
      >
        <USelectMenu
          :model-value="anonymousCount"
          :items="anonymousPlayerOptions"
          value-key="value"
          class="w-full"
          :disabled="isUpdatingAnonymous"
          aria-label="Cantidad de jugadores anónimos"
          @update:model-value="onAnonymousChange"
        />
      </UFormField>
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
          v-if="!editingPlayer"
          label="Teléfono"
          name="telefono"
          required
          hint="Solo se usa para evitar reservas duplicadas. No se almacena ni se muestra."
        >
          <UInput
            v-model="playerFormState.telefono"
            class="w-full"
          />
        </UFormField>

        <p
          v-else
          class="text-xs text-slate-500"
        >
          El teléfono no se edita (se almacena de forma segura como hash).
        </p>

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

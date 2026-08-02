<script setup lang="ts">
import * as z from 'zod'
import type { GameSession, GameSessionInsert, GameSessionUpdate, SessionMasterRef } from '~/types/session'

const supabase = useSupabaseClient()
const toast = useToast()

const props = defineProps<{
  session?: GameSession | null
}>()

const emit = defineEmits<{
  saved: [session: GameSession]
  cancel: []
}>()

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const masters = ref<SessionMasterRef[]>([])
const isLoadingMasters = ref(true)

const schema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string().optional().nullable(),
  campaign: z.string().optional().nullable(),
  image_url: z.string().url('Debe ser una URL válida').optional().or(z.literal('')).nullable(),
  system: z.string().optional().nullable(),
  session_type: z.string().optional().nullable(),
  audience: z.string().optional().nullable(),
  mode: z.string().optional().nullable(),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
  hora_inicio: z.string().optional().nullable(),
  hora_fin: z.string().optional().nullable(),
  zona_horaria: z.string().optional().nullable(),
  rrule: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  costo: z.union([z.number(), z.literal('')]).optional(),
  max_players: z.union([z.number(), z.literal('')]).optional(),
  current_players: z.union([z.number(), z.literal('')]).optional(),
  master_id: z.string().min(1, 'El master es obligatorio')
})

type Schema = z.infer<typeof schema>

const initialState = (): Schema => ({
  title: props.session?.title ?? '',
  description: props.session?.description ?? '',
  campaign: props.session?.campaign ?? '',
  image_url: props.session?.image_url ?? '',
  system: props.session?.system ?? '',
  session_type: props.session?.session_type ?? '',
  audience: props.session?.audience ?? '',
  mode: props.session?.mode ?? '',
  fecha_inicio: props.session?.fecha_inicio ?? '',
  hora_inicio: props.session?.hora_inicio ?? '',
  hora_fin: props.session?.hora_fin ?? '',
  zona_horaria: props.session?.zona_horaria ?? '',
  rrule: props.session?.rrule ?? '',
  location: props.session?.location ?? '',
  costo: props.session?.costo ?? '',
  max_players: props.session?.max_players ?? '',
  current_players: props.session?.current_players ?? '',
  master_id: props.session?.master_id ?? ''
})

const state = reactive<Schema>(initialState())

const masterItems = computed(() =>
  masters.value.map((master) => ({
    label: master.full_name || 'Sin nombre',
    value: master.id
  }))
)

const toNumberOrNull = (value: number | '' | undefined | null) => {
  if (value === '' || value === null || value === undefined) return null
  return Number(value)
}

const buildPayload = (): GameSessionInsert => ({
  title: state.title.trim(),
  description: state.description?.trim() || null,
  campaign: state.campaign?.trim() || null,
  image_url: state.image_url?.trim() || null,
  system: state.system?.trim() || null,
  session_type: state.session_type?.trim() || null,
  audience: state.audience?.trim() || null,
  mode: state.mode?.trim() || null,
  fecha_inicio: state.fecha_inicio,
  hora_inicio: state.hora_inicio?.trim() || null,
  hora_fin: state.hora_fin?.trim() || null,
  zona_horaria: state.zona_horaria?.trim() || null,
  rrule: state.rrule?.trim() || null,
  location: state.location?.trim() || null,
  costo: toNumberOrNull(state.costo),
  max_players: toNumberOrNull(state.max_players),
  current_players: toNumberOrNull(state.current_players),
  master_id: state.master_id
})

onMounted(async () => {
  const { data, error } = await supabase
    .from('dagger_masters')
    .select('id,full_name')
    .order('full_name', { ascending: true })

  if (!error && data) {
    masters.value = data as SessionMasterRef[]
  }
  isLoadingMasters.value = false
})

async function submitSession() {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = null

  const payload = buildPayload()

  if (props.session?.id) {
    const sessionId = props.session.id
    const updatePayload: GameSessionUpdate = payload
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update(updatePayload)
      .eq('id', sessionId)

    if (updateError) {
      isSubmitting.value = false
      errorMessage.value = updateError.message
      return
    }

    const { data: refreshed, error: selectError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    isSubmitting.value = false

    if (selectError) {
      errorMessage.value = selectError.message
      return
    }

    toast.add({
      title: 'Sesión actualizada',
      color: 'success',
      icon: 'i-lucide-circle-check'
    })

    emit('saved', (refreshed as GameSession | null) ?? ({ ...props.session, ...payload } as GameSession))
    return
  }

  const { data, error } = await supabase
    .from('game_sessions')
    .insert(payload)
    .select('*')
    .single()

  isSubmitting.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  toast.add({
    title: 'Sesión creada',
    color: 'success',
    icon: 'i-lucide-circle-check'
  })

  emit('saved', data as GameSession)
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="w-full space-y-8"
    @submit="submitSession"
  >
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-900">Información básica</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Título" name="title" required>
          <UInput v-model="state.title" class="w-full" />
        </UFormField>
        <UFormField label="Campaña" name="campaign">
          <UInput v-model="state.campaign" class="w-full" />
        </UFormField>
        <UFormField label="URL de imagen" name="image_url" class="md:col-span-2">
          <UInput v-model="state.image_url" class="w-full" />
        </UFormField>
        <UFormField label="Descripción" name="description" class="md:col-span-2">
          <UTextarea v-model="state.description" class="w-full" :rows="4" />
        </UFormField>
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-900">Clasificación</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Sistema" name="system">
          <UInput v-model="state.system" class="w-full" />
        </UFormField>
        <UFormField label="Tipo de sesión" name="session_type">
          <UInput v-model="state.session_type" class="w-full" />
        </UFormField>
        <UFormField label="Audiencia" name="audience">
          <UInput v-model="state.audience" class="w-full" />
        </UFormField>
        <UFormField label="Modalidad" name="mode">
          <UInput v-model="state.mode" class="w-full" />
        </UFormField>
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-900">Programación</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Fecha de inicio" name="fecha_inicio" required>
          <UInput v-model="state.fecha_inicio" type="date" class="w-full" />
        </UFormField>
        <UFormField label="Zona horaria" name="zona_horaria">
          <UInput v-model="state.zona_horaria" class="w-full" placeholder="UTC, America/Mexico_City..." />
        </UFormField>
        <UFormField label="Hora de inicio" name="hora_inicio">
          <UInput v-model="state.hora_inicio" type="time" class="w-full" />
        </UFormField>
        <UFormField label="Hora de fin" name="hora_fin">
          <UInput v-model="state.hora_fin" type="time" class="w-full" />
        </UFormField>
        <UFormField label="Recurrencia (RRULE)" name="rrule" class="md:col-span-2">
          <UInput v-model="state.rrule" class="w-full" placeholder="FREQ=WEEKLY;BYDAY=MO" />
        </UFormField>
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-900">Logística</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Ubicación" name="location" class="md:col-span-2">
          <UInput v-model="state.location" class="w-full" />
        </UFormField>
        <UFormField label="Costo" name="costo">
          <UInput v-model="state.costo" type="number" class="w-full" />
        </UFormField>
        <UFormField label="Jugadores actuales" name="current_players">
          <UInput v-model="state.current_players" type="number" class="w-full" />
        </UFormField>
        <UFormField label="Máximo de jugadores" name="max_players" class="md:col-span-2">
          <UInput v-model="state.max_players" type="number" class="w-full" />
        </UFormField>
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-900">Master</h2>
      <UFormField label="Master" name="master_id" required>
        <USelectMenu
          v-model="state.master_id"
          :items="masterItems"
          :loading="isLoadingMasters"
          value-key="value"
          class="w-full"
          placeholder="Selecciona un master"
        />
      </UFormField>
    </section>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <div class="flex justify-end gap-2 pt-4 border-t border-slate-200">
      <UButton
        label="Cancelar"
        color="neutral"
        variant="ghost"
        class="cursor-pointer"
        :disabled="isSubmitting"
        @click="emit('cancel')"
      />
      <UButton
        type="submit"
        :label="props.session?.id ? 'Actualizar Sesión' : 'Guardar Sesión'"
        class="cursor-pointer"
        :loading="isSubmitting"
      />
    </div>
  </UForm>
</template>
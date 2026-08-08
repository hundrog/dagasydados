<script setup lang="ts">
import * as z from 'zod'
import { RRule } from 'rrule'
import type { GameSession, GameSessionInsert, SessionMasterRef } from '~/types/session'

const supabase = useSupabaseClient()
const toast = useToast()
const { uploadSessionImage, deleteSessionImageByUrl } = useSessionImage()
const { isAdmin, refresh: refreshAdminStatus } = useIsAdmin()
const user = useSupabaseUser()

const props = defineProps<{
  session?: GameSession | null
}>()

const emit = defineEmits<{
  saved: [session: GameSession]
  cancel: []
}>()

type Periodicity = 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

const periodicityOptions: Array<{ label: string, value: Periodicity }> = [
  { label: 'Sin recurrencia', value: 'NONE' },
  { label: 'Semanal', value: 'WEEKLY' },
  { label: 'Quincenal', value: 'BIWEEKLY' },
  { label: 'Mensual', value: 'MONTHLY' }
]

const systemOptions = computed(() => {
  const defaults = ['Daggerheart', 'Mork Borg', 'Vaesen']
  const current = state.system?.trim()
  return current && !defaults.includes(current) ? [...defaults, current] : defaults
})

const modeOptions: Array<{ label: string, value: string }> = [
  { label: 'Online', value: 'online' },
  { label: 'Presencial', value: 'offline' },
  { label: 'Híbrido', value: 'hybrid' }
]

const dayOptions: Array<{ code: string, label: string, short: string }> = [
  { code: 'MO', label: 'Lunes', short: 'L' },
  { code: 'TU', label: 'Martes', short: 'Ma' },
  { code: 'WE', label: 'Miércoles', short: 'Mi' },
  { code: 'TH', label: 'Jueves', short: 'J' },
  { code: 'FR', label: 'Viernes', short: 'V' },
  { code: 'SA', label: 'Sábado', short: 'S' },
  { code: 'SU', label: 'Domingo', short: 'D' }
]

const dayCodeToWeekday: Record<string, number> = {
  MO: RRule.MO.weekday,
  TU: RRule.TU.weekday,
  WE: RRule.WE.weekday,
  TH: RRule.TH.weekday,
  FR: RRule.FR.weekday,
  SA: RRule.SA.weekday,
  SU: RRule.SU.weekday
}

const weekdayToCode: Record<number, string> = {
  [RRule.MO.weekday]: 'MO',
  [RRule.TU.weekday]: 'TU',
  [RRule.WE.weekday]: 'WE',
  [RRule.TH.weekday]: 'TH',
  [RRule.FR.weekday]: 'FR',
  [RRule.SA.weekday]: 'SA',
  [RRule.SU.weekday]: 'SU'
}

const weekdayCodeFromDate = (date: Date): string | null =>
  weekdayToCode[(date.getDay() + 6) % 7] ?? null

const startWeekdayCode = computed(() => {
  if (!state.fecha_inicio) return null
  const date = parseLocalDate(state.fecha_inicio)
  if (!date) return null
  return weekdayCodeFromDate(date)
})

const userTouchedDays = ref(false)

const parseRrule = (raw: string | null | undefined) => {
  if (!raw) {
    return { periodicity: 'NONE' as Periodicity, days: [] as string[], count: null as number | null }
  }
  try {
    let body = raw
    if (raw.startsWith('DTSTART:')) {
      const idx = raw.indexOf('RRULE:')
      if (idx === -1) {
        return { periodicity: 'NONE' as Periodicity, days: [] as string[], count: null as number | null }
      }
      body = raw.slice(idx + 'RRULE:'.length)
    } else if (raw.startsWith('RRULE:')) {
      body = raw.slice('RRULE:'.length)
    }
    const rule = RRule.fromString(`RRULE:${body}`)
    const options = rule.origOptions
    let periodicity: Periodicity = 'NONE'
    if (options.freq === RRule.WEEKLY) {
      periodicity = options.interval === 2 ? 'BIWEEKLY' : 'WEEKLY'
    } else if (options.freq === RRule.MONTHLY) {
      periodicity = 'MONTHLY'
    }
    const byday = (options.byweekday ?? []) as Array<number | { weekday: number }>
    const days = byday
      .map((entry) => {
        const weekday = typeof entry === 'number' ? entry : entry.weekday
        return Object.entries(dayCodeToWeekday).find(([, value]) => value === weekday)?.[0]
      })
      .filter((code): code is string => Boolean(code))
    const count = typeof options.count === 'number' && options.count > 0 ? options.count : null
    return { periodicity, days, count }
  } catch {
    return { periodicity: 'NONE' as Periodicity, days: [] as string[], count: null as number | null }
  }
}

const initialParsed = parseRrule(props.session?.rrule)

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const masters = ref<SessionMasterRef[]>([])
const isLoadingMasters = ref(true)

const periodicity = ref<Periodicity>(initialParsed.periodicity)
const days = ref<string[]>(initialParsed.days)
const count = ref<number | '' | undefined>(initialParsed.count ?? '')
const isRruleTouched = ref<boolean>(Boolean(props.session?.rrule))

const schema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string().optional(),
  campaign: z.string().optional(),
  image_url: z.string().optional(),
  system: z.string().optional(),
  session_type: z.string().optional(),
  audience: z.string().optional(),
  mode: z.string().optional(),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
  hora_inicio: z.string().optional(),
  hora_fin: z.string().optional(),
  zona_horaria: z.string().optional(),
  rrule: z.string().optional(),
  location: z.string().optional(),
  costo: z.union([z.number(), z.literal('')]).optional(),
  max_players: z.union([z.number(), z.literal('')]).optional(),
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
  master_id: props.session?.master_id ?? ''
})

const state = reactive<Schema>(initialState())

const imageFile = ref<File | null>(null)

const imagePreview = computed(() => {
  if (imageFile.value) return URL.createObjectURL(imageFile.value)
  return state.image_url || null
})

const onImageChange = () => {
  if (!imageFile.value) {
    state.image_url = props.session?.image_url ?? ''
    return
  }
  if (imageFile.value.size > 5 * 1024 * 1024) {
    toast.add({
      title: 'La imagen supera el tamaño máximo de 5 MB',
      color: 'error',
      icon: 'i-lucide-octagon-x'
    })
    imageFile.value = null
  }
}

const clearImage = () => {
  imageFile.value = null
  state.image_url = props.session?.image_url ?? ''
}

const masterItems = computed(() =>
  masters.value.map(master => ({
    label: master.full_name || 'Sin nombre',
    value: master.id
  }))
)

const toNumberOrNull = (value: number | '' | undefined | null) => {
  if (value === '' || value === null || value === undefined) return null
  return Number(value)
}

const frequencyForPeriodicity = (value: Periodicity): number | null => {
  if (value === 'WEEKLY') return RRule.WEEKLY
  if (value === 'BIWEEKLY') return RRule.WEEKLY
  if (value === 'MONTHLY') return RRule.MONTHLY
  return null
}

const buildRruleString = (): string => {
  if (periodicity.value === 'NONE') return ''

  const freq = frequencyForPeriodicity(periodicity.value)
  if (!freq) return ''

  const interval = periodicity.value === 'BIWEEKLY' ? 2 : 1

  const options: Record<string, unknown> = {
    freq,
    interval,
    dtstart: state.fecha_inicio ? (parseLocalDate(state.fecha_inicio) ?? new Date()) : new Date()
  }

  if (freq === RRule.WEEKLY && days.value.length > 0) {
    options.byweekday = days.value
      .map(code => dayCodeToWeekday[code])
      .filter((weekday): weekday is number => typeof weekday === 'number')
  }

  if (count.value && Number(count.value) > 0) {
    options.count = Number(count.value)
  }

  const serialized = new RRule(options).toString()
  const rulePart = serialized.split('\n').find(line => line.startsWith('RRULE:'))
  return rulePart ?? ''
}

const syncRruleFromInputs = () => {
  if (isRruleTouched.value) return
  state.rrule = buildRruleString()
}

const onRruleInput = () => {
  isRruleTouched.value = true
}

const onPeriodicityChange = () => {
  isRruleTouched.value = false
  syncRruleFromInputs()
}

const onCountChange = () => {
  isRruleTouched.value = false
  syncRruleFromInputs()
}

const toggleDay = (code: string) => {
  const index = days.value.indexOf(code)
  if (index === -1) {
    days.value.push(code)
  } else {
    days.value.splice(index, 1)
  }
  userTouchedDays.value = true
  isRruleTouched.value = false
  syncRruleFromInputs()
}

watch(() => state.fecha_inicio, (newDate, oldDate) => {
  const oldDay = parseLocalDate(oldDate)
  const oldCode = oldDay ? weekdayCodeFromDate(oldDay) : null
  const isFollowingDate = days.value.length === 1 && days.value[0] === oldCode
  if ((!userTouchedDays.value || isFollowingDate) && startWeekdayCode.value) {
    days.value = [startWeekdayCode.value]
  }
  if (!isRruleTouched.value) {
    state.rrule = buildRruleString()
  }
})

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
  master_id: state.master_id
})

onMounted(async () => {
  await refreshAdminStatus()

  let query = supabase
    .from('dagger_masters')
    .select('id,full_name,user_name,avatar_url,phone')

  if (!isAdmin.value) {
    query = query.eq('id', user.value?.sub ?? '__no_master__')
  }

  const { data, error } = await query.order('full_name', { ascending: true })

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
    const previousImageUrl = props.session.image_url

    let uploadedUrl: string | null = null
    if (imageFile.value) {
      try {
        uploadedUrl = await uploadSessionImage(imageFile.value)
        payload.image_url = uploadedUrl
      } catch (uploadError) {
        isSubmitting.value = false
        errorMessage.value = uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen'
        return
      }
    }

    const { error: updateError } = await supabase
      .from('game_sessions')
      .update(payload)
      .eq('id', sessionId)

    if (updateError) {
      if (uploadedUrl) await deleteSessionImageByUrl(uploadedUrl)
      isSubmitting.value = false
      errorMessage.value = updateError.message
      return
    }

    if (uploadedUrl && previousImageUrl !== uploadedUrl) {
      await deleteSessionImageByUrl(previousImageUrl)
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

  let uploadedUrl: string | null = null
  if (imageFile.value) {
    try {
      uploadedUrl = await uploadSessionImage(imageFile.value)
      payload.image_url = uploadedUrl
    } catch (uploadError) {
      isSubmitting.value = false
      errorMessage.value = uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen'
      return
    }
  }

  const { data, error } = await supabase
    .from('game_sessions')
    .insert(payload)
    .select('*')
    .single()

  isSubmitting.value = false

  if (error) {
    if (uploadedUrl) await deleteSessionImageByUrl(uploadedUrl)
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
    <section
      id="informacion-basica"
      class="space-y-4 scroll-mt-24"
    >
      <h2 class="text-lg font-semibold text-primary-900">
        Información básica
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField
          label="Título"
          name="title"
          required
        >
          <UInput
            v-model="state.title"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Campaña"
          name="campaign"
        >
          <UInput
            v-model="state.campaign"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Imagen de la sesión"
          name="image_url"
          class="md:col-span-2"
        >
          <div class="space-y-4">
            <div
              v-if="imagePreview"
              class="relative w-full max-w-sm"
            >
              <img
                :src="imagePreview"
                alt="Vista previa de la sesión"
                class="w-full h-48 object-cover rounded-lg border border-slate-200"
              >
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                class="absolute top-2 right-2 cursor-pointer"
                aria-label="Quitar imagen"
                :disabled="isSubmitting"
                @click="clearImage"
              />
            </div>
            <UFileUpload
              v-model="imageFile"
              accept="image/*"
              :disabled="isSubmitting"
              label="Subir imagen"
              description="JPG, PNG o WebP · Máximo 5 MB"
              @change="onImageChange"
            />
          </div>
        </UFormField>
        <UFormField
          label="Descripción"
          name="description"
          class="md:col-span-2"
        >
          <UTextarea
            v-model="state.description"
            class="w-full"
            :rows="4"
          />
        </UFormField>
      </div>
    </section>

    <section
      id="clasificacion"
      class="space-y-4 scroll-mt-24"
    >
      <h2 class="text-lg font-semibold text-primary-900">
        Clasificación
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField
          label="Sistema"
          name="system"
        >
          <USelectMenu
            v-model="state.system"
            :items="systemOptions"
            create-item
            class="w-full"
            placeholder="Selecciona o escribe un sistema"
          />
        </UFormField>
        <UFormField
          label="Tipo de sesión"
          name="session_type"
        >
          <UInput
            v-model="state.session_type"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Audiencia"
          name="audience"
        >
          <UInput
            v-model="state.audience"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Modalidad"
          name="mode"
        >
          <USelectMenu
            v-model="state.mode"
            :items="modeOptions"
            value-key="value"
            class="w-full"
            placeholder="Selecciona una modalidad"
          />
        </UFormField>
      </div>
    </section>

    <section
      id="programacion"
      class="space-y-4 scroll-mt-24"
    >
      <h2 class="text-lg font-semibold text-primary-900">
        Programación
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField
          label="Fecha de inicio"
          name="fecha_inicio"
          required
        >
          <UInput
            v-model="state.fecha_inicio"
            type="date"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Zona horaria"
          name="zona_horaria"
        >
          <UInput
            v-model="state.zona_horaria"
            class="w-full"
            placeholder="UTC, America/Mexico_City..."
          />
        </UFormField>
        <UFormField
          label="Hora de inicio"
          name="hora_inicio"
        >
          <UInput
            v-model="state.hora_inicio"
            type="time"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Hora de fin"
          name="hora_fin"
        >
          <UInput
            v-model="state.hora_fin"
            type="time"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="space-y-4 pt-2">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField
            label="Periodicidad"
            name="periodicidad"
          >
            <URadioGroup
              v-model="periodicity"
              :items="periodicityOptions"
              orientation="horizontal"
              @update:model-value="onPeriodicityChange"
            />
          </UFormField>

          <UFormField
            label="Número de sesiones"
            name="count"
          >
            <UInput
              v-model="count"
              type="number"
              min="1"
              class="w-full"
              placeholder="Sin límite"
              :disabled="periodicity === 'NONE'"
              @update:model-value="onCountChange"
            />
          </UFormField>
        </div>

        <UFormField
          v-if="periodicity !== 'NONE' && periodicity !== 'MONTHLY'"
          label="Días de la semana"
          name="dias"
          hint="Selecciona uno o varios días. Define BYDAY en RRULE."
        >
          <div class="flex flex-wrap gap-2">
            <button
              v-for="day in dayOptions"
              :key="day.code"
              type="button"
              class="cursor-pointer flex items-center justify-center w-10 h-10 rounded-full border text-sm font-semibold transition"
              :class="days.includes(day.code)
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'"
              :aria-label="day.label"
              :title="day.label"
              @click="toggleDay(day.code)"
            >
              {{ day.short }}
            </button>
          </div>
        </UFormField>

        <UFormField
          label="RRULE"
          name="rrule"
          hint="Se genera automáticamente. Puedes editarlo para casos avanzados."
        >
          <UInput
            v-model="state.rrule"
            class="w-full font-mono text-sm"
            placeholder="FREQ=WEEKLY;BYDAY=MO"
            @update:model-value="onRruleInput"
          />
        </UFormField>
      </div>
    </section>

    <section
      id="logistica"
      class="space-y-4 scroll-mt-24"
    >
      <h2 class="text-lg font-semibold text-primary-900">
        Logística
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField
          label="Ubicación"
          name="location"
          class="md:col-span-2"
        >
          <UInput
            v-model="state.location"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Costo"
          name="costo"
        >
          <UInput
            v-model="state.costo"
            type="number"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Máximo de jugadores"
          name="max_players"
        >
          <UInput
            v-model="state.max_players"
            type="number"
            class="w-full"
          />
        </UFormField>
      </div>
    </section>

    <AdminSessionPlayers
      v-if="props.session?.id"
      id="jugadores"
      :session-id="props.session.id"
    />

    <p
      v-else
      class="text-sm text-slate-500"
    >
      Guarda la sesión primero para poder administrar los jugadores inscritos.
    </p>

    <section
      id="master"
      class="space-y-4 scroll-mt-24"
    >
      <h2 class="text-lg font-semibold text-primary-900">
        Master
      </h2>
      <UFormField
        label="Master"
        name="master_id"
        required
      >
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

    <p
      v-if="errorMessage"
      class="text-sm text-red-600"
    >
      {{ errorMessage }}
    </p>

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

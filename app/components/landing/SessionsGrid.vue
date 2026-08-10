<script setup lang="ts">
import type { GameSessionWithMaster } from '~/types/session'

const supabase = useSupabaseClient()

const sessions = ref<GameSessionWithMaster[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

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

const { lookups, refresh: refreshLookups } = useLookups()

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

  if (selectedWeekday.value !== 'all' && !occurrences.some(occurrence => occurrence.getDay() === selectedWeekday.value)) {
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

  const { data, error } = await supabase
    .from('game_sessions')
    .select('id,title,system,session_type,audience,mode,image_url,max_players,location,description,costo,fecha_inicio,hora_inicio,hora_fin,rrule,session_players(count),master:dagger_masters(id,full_name,user_name,avatar_url,phone)')

  if (error) {
    errorMessage.value = error.message
  } else {
    sessions.value = (data ?? []) as unknown as GameSessionWithMaster[]
  }

  isLoading.value = false
}

onMounted(() => {
  void refreshLookups()
  loadSessions()
})
</script>

<template>
  <div
    v-if="isLoading"
    class="p-4 text-sm text-slate-500 text-center"
  >
    Cargando sesiones...
  </div>
  <div
    v-else-if="errorMessage"
    class="p-4 text-sm text-red-600 text-center"
  >
    {{ errorMessage }}
  </div>
  <div
    v-else-if="sessions.length === 0"
    class="p-4 text-sm text-slate-500 text-center"
  >
    Aún no hay sesiones publicadas.
  </div>
  <div v-else>
    <div class="card p-4 mb-8 flex flex-wrap items-end gap-4 justify-around max-w-4xl mx-auto">
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

    <div
      v-if="filteredSessions.length === 0"
      class="p-4 text-sm text-slate-500 text-center"
    >
      No hay partidas que coincidan con los filtros.
    </div>
    <div
      v-else
      class="w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <LandingSessionCard
        v-for="session in filteredSessions"
        :key="session.id"
        :session="session"
      />
    </div>
  </div>
</template>

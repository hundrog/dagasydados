<script setup lang="ts">
import type { GameSessionWithMaster } from '~/types/session'
import { hasDedicatedSection } from '~/utils/eventSessions'

const supabase = useSupabaseClient()

const sessions = ref<GameSessionWithMaster[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const { selectedMonth, monthOptions, resolveRange, isDefault, reset: resetMonth } = useMonthFilter()

const selectedWeekday = ref<number | 'all'>('all')
const selectedMode = ref<string>('all')
const selectedSessionType = ref<string>('all')

type SortOption = { label: string, value: 'players' | 'date' }

const selectedSort = ref<SortOption['value']>('players')

const sortOptions: SortOption[] = [
  { label: 'Más vacías primero', value: 'players' },
  { label: 'Fecha más cercana primero', value: 'date' }
]

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

const lookupsStore = useLookupsStore()
const { lookups } = storeToRefs(lookupsStore)

const modeOptions = computed(() => [
  { label: 'Todas las modalidades', value: 'all' },
  ...(lookups.value?.modes ?? [])
])

const sessionTypeOptions = computed(() => [
  { label: 'Todos los tipos', value: 'all' },
  ...(lookups.value?.session_types ?? []).map(type => ({ label: type, value: type }))
])

const occurrencesInMonth = (session: GameSessionWithMaster): Date[] => {
  const range = resolveRange()
  if (!range) return []

  const start = parseLocalDate(session.fecha_inicio)
  if (!start) return []

  const isInMonth = start >= range.start && start <= range.end
  if (!session.rrule) {
    return isInMonth ? [start] : []
  }

  const rule = parseSessionRule(session.rrule, start)
  if (!rule) {
    return isInMonth ? [start] : []
  }

  return rule.between(range.start, range.end, true)
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

const startTimestamp = (session: GameSessionWithMaster) =>
  parseLocalDate(session.fecha_inicio)?.getTime() ?? 0

const openSeats = (session: GameSessionWithMaster) => {
  if (!session.max_players) return Number.POSITIVE_INFINITY
  return session.max_players - (session.player_count ?? 0)
}

const compareByDate = (a: GameSessionWithMaster, b: GameSessionWithMaster) =>
  startTimestamp(a) - startTimestamp(b)

const compareByOpenSeats = (a: GameSessionWithMaster, b: GameSessionWithMaster) => {
  const seatsDiff = openSeats(b) - openSeats(a)
  if (!Number.isNaN(seatsDiff) && seatsDiff !== 0) return seatsDiff
  return compareByDate(a, b)
}

const sortComparators: Record<SortOption['value'], (a: GameSessionWithMaster, b: GameSessionWithMaster) => number> = {
  players: compareByOpenSeats,
  date: compareByDate
}

const filteredSessions = computed(() => {
  const matches = sessions.value.filter(matchesFilters)
  return [...matches].sort(sortComparators[selectedSort.value])
})

const eventGroups = computed(() => {
  const groups: Array<{ id: string, event: GameSessionWithMaster['event'] & { name: string }, sessions: GameSessionWithMaster[] }> = []
  const map = new Map<string, typeof groups[number]>()

  for (const session of filteredSessions.value) {
    if (!hasDedicatedSection(session)) continue
    const event = session.event
    if (!event) continue
    let group = map.get(event.id)
    if (!group) {
      group = { id: event.id, event, sessions: [] }
      map.set(event.id, group)
      groups.push(group)
    }
    group.sessions.push(session)
  }

  return groups
})

const mixedSessions = computed(() =>
  filteredSessions.value.filter(session => !hasDedicatedSection(session))
)

const hasActiveFilters = computed(() =>
  !isDefault()
  || selectedWeekday.value !== 'all'
  || selectedMode.value !== 'all'
  || selectedSessionType.value !== 'all'
)

const loadSessions = async () => {
  isLoading.value = true
  errorMessage.value = null

  const { data, error } = await supabase
    .from('game_sessions')
    .select('id,title,system,session_type,audience,mode,image_url,max_players,location,description,costo,fecha_inicio,hora_inicio,hora_fin,rrule,event_id,event:events(id,name,slug,description,fecha_inicio,hora_inicio,fecha_fin,hora_fin,zona_horaria,image_url,highlight_sessions),master:dagger_masters(id,full_name,user_name,avatar_url,phone)')
    .eq('status', 'published')

  if (error) {
    errorMessage.value = error.message
  } else {
    const rawSessions = (data ?? []) as unknown as GameSessionWithMaster[]

    const counts = await Promise.all(
      rawSessions.map(async (s) => {
        const { data: count } = await supabase.rpc('session_player_count', { p_session_id: s.id })
        return { id: s.id, count: count ?? 0 }
      })
    )

    sessions.value = rawSessions.map(s => ({
      ...s,
      player_count: counts.find(c => c.id === s.id)?.count ?? 0
    }))
  }

  isLoading.value = false
}

onMounted(() => {
  void lookupsStore.refresh()
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
    <div class="card p-4 mb-8 flex flex-wrap items-end gap-4 justify-around max-w-7xl mx-auto">
      <div class="flex flex-col gap-1.5">
        <span class="label-metadata text-on-surface-dim">
          Ordenar por
        </span>
        <USelectMenu
          v-model="selectedSort"
          :items="sortOptions"
          value-key="value"
          leading-icon="i-lucide-arrow-up-down"
          class="w-52"
        />
      </div>

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
        @click="resetMonth(); selectedWeekday = 'all'; selectedMode = 'all'; selectedSessionType = 'all'"
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
      class="space-y-12"
    >
      <LandingEventSection
        v-for="group in eventGroups"
        :key="group.id"
        :event="group.event"
        :sessions="group.sessions"
      />

      <div
        v-if="eventGroups.length > 0 && mixedSessions.length > 0"
        class="flex items-center gap-4 mb-6"
      >
        <div class="h-px flex-1 bg-primary/30" />
      </div>

      <div
        v-if="mixedSessions.length > 0"
        class="w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <LandingSessionCard
          v-for="session in mixedSessions"
          :key="session.id"
          :session="session"
        />
      </div>
    </div>
  </div>
</template>

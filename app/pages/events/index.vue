<script setup lang="ts">
import type { Event } from '~/types/event'

const supabase = useSupabaseClient()

const { selectedMonth, monthOptions, resolveRange } = useMonthFilter({ initial: 'all' })

const events = ref<Event[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const overlapsSelectedMonth = (event: Event) => {
  const range = resolveRange()
  if (!range) return true

  const start = parseLocalDate(event.fecha_inicio)
  const end = parseLocalDate(event.fecha_fin)
  if (!start || !end) return false

  return start <= range.end && end >= range.start
}

const visibleEvents = computed(() => events.value.filter(overlapsSelectedMonth))

const loadEvents = async () => {
  isLoading.value = true
  errorMessage.value = null

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('fecha_fin', localDateValue())
    .order('fecha_inicio', { ascending: true })

  if (error) {
    errorMessage.value = error.message
  } else {
    events.value = (data ?? []) as Event[]
  }

  isLoading.value = false
}

onMounted(() => {
  loadEvents()
})
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="max-w-5xl mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="font-display text-display-sm text-on-surface leading-tight">
          Eventos
        </h1>
        <p class="label-metadata text-on-surface-dim mt-2">
          Los próximos eventos de la comunidad, con sus mesas y sesiones.
        </p>
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
      <div
        v-else-if="events.length === 0"
        class="p-4 text-sm text-slate-500 text-center"
      >
        Aún no hay eventos programados.
      </div>
      <template v-else>
        <div class="card p-4 mb-8 flex flex-wrap items-end gap-4">
          <div class="flex flex-col gap-1.5">
            <span class="label-metadata text-on-surface-dim">
              Mes
            </span>
            <USelectMenu
              v-model="selectedMonth"
              :items="monthOptions"
              value-key="value"
              leading-icon="i-lucide-calendar-days"
              class="w-52"
            />
          </div>
        </div>

        <div
          v-if="visibleEvents.length === 0"
          class="p-4 text-sm text-slate-500 text-center"
        >
          No hay eventos en el mes seleccionado.
        </div>
        <div
          v-else
          class="w-full flex flex-col gap-6"
        >
          <LandingEventCard
            v-for="event in visibleEvents"
            :key="event.id"
            :event="event"
          />
        </div>
      </template>
    </div>
  </div>
</template>

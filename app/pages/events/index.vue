<script setup lang="ts">
import type { Event } from '~/types/event'

const supabase = useSupabaseClient()

const events = ref<Event[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const loadEvents = async () => {
  isLoading.value = true
  errorMessage.value = null

  const { data, error } = await supabase
    .from('events')
    .select('*')
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
          Todos los eventos de la comunidad, con sus mesas y sesiones.
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
        Aún no hay eventos publicados.
      </div>
      <div
        v-else
        class="w-full flex flex-col gap-6"
      >
        <LandingEventCard
          v-for="event in events"
          :key="event.id"
          :event="event"
        />
      </div>
    </div>
  </div>
</template>

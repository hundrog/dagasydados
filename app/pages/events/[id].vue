<script setup lang="ts">
import type { Event } from '~/types/event'
import type { GameSessionWithMaster } from '~/types/session'
import { useClipboard } from '@vueuse/core'

const route = useRoute()
const supabase = useSupabaseClient()
const toast = useToast()
const { copy } = useClipboard()

const event = ref<Event | null>(null)
const sessions = ref<GameSessionWithMaster[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const placeholderUrl = 'https://placehold.co/1600x900/1e174a/9fa7ff?text=Sin+imagen'

const formatDate = (value: string | null | undefined) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatRange = () => {
  const start = new Date(event.value?.start_datetime ?? '')
  const end = new Date(event.value?.end_datetime ?? '')
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return ''

  const sameDay = start.toDateString() === end.toDateString()
  const date = start.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
  const hour = (d: Date) => d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })

  if (sameDay) return `${date} · ${hour(start)} - ${hour(end)}`

  const endDate = end.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
  return `${date} - ${endDate}`
}

const loadEvent = async () => {
  isLoading.value = true
  errorMessage.value = null

  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', String(route.params.id))
    .maybeSingle()

  if (eventError) {
    errorMessage.value = eventError.message
    isLoading.value = false
    return
  }

  if (!eventData) {
    errorMessage.value = 'No se encontró el evento'
    isLoading.value = false
    return
  }

  event.value = eventData as Event

  const { data: sessionData, error: sessionError } = await supabase
    .from('game_sessions')
    .select('id,title,system,session_type,audience,mode,image_url,max_players,location,description,costo,fecha_inicio,hora_inicio,hora_fin,rrule,event_id,event:events(id,name,description,start_datetime,end_datetime,image_url),master:dagger_masters(id,full_name,user_name,avatar_url,phone)')
    .eq('event_id', String(route.params.id))
    .eq('status', 'published')

  if (sessionError) {
    errorMessage.value = sessionError.message
    isLoading.value = false
    return
  }

  const rawSessions = (sessionData ?? []) as unknown as GameSessionWithMaster[]

  const counts = await Promise.all(
    rawSessions.map(async (s) => {
      const { data: count } = await supabase.rpc('session_player_count', { p_session_id: s.id })
      return { id: s.id, count: count ?? 0 }
    })
  )

  sessions.value = rawSessions
    .map(s => ({
      ...s,
      player_count: counts.find(c => c.id === s.id)?.count ?? 0
    }))
    .sort((a, b) => (parseLocalDate(a.fecha_inicio)?.getTime() ?? 0) - (parseLocalDate(b.fecha_inicio)?.getTime() ?? 0))

  isLoading.value = false
}

onMounted(() => {
  loadEvent()
})

const goBack = () => {
  navigateTo('/#mesas')
}

const copyUrl = async () => {
  await copy(window.location.href)
  toast.add({
    title: 'URL copiada al portapapeles',
    color: 'success',
    icon: 'i-lucide-circle-check'
  })
}
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="max-w-5xl mx-auto px-4 py-8">
      <div class="flex justify-between items-center">
        <UButton
          label="Volver a la cartelera"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          class="cursor-pointer mb-6"
          @click="goBack"
        />
        <UButton
          label="Copiar URL"
          icon="i-lucide-link"
          color="neutral"
          variant="ghost"
          class="cursor-pointer mb-6"
          :disabled="isLoading"
          @click="copyUrl"
        />
      </div>

      <div
        v-if="isLoading"
        class="p-4 text-sm text-slate-500"
      >
        Cargando evento...
      </div>
      <div
        v-else-if="errorMessage"
        class="p-4 text-sm text-red-600"
      >
        {{ errorMessage }}
      </div>

      <article
        v-else-if="event"
        class="space-y-8"
      >
        <div class="relative aspect-[16/9] overflow-hidden rounded-xl">
          <img
            :src="event.image_url && event.image_url.length > 0 ? event.image_url : placeholderUrl"
            :alt="event.name"
            class="w-full h-full object-cover"
          >
          <div class="absolute inset-0 bg-linear-to-t from-surface-high/30 via-surface-high/10 to-transparent" />
        </div>

        <div>
          <h1 class="font-display text-display-sm text-on-surface leading-tight">
            {{ event.name }}
          </h1>
          <p
            v-if="formatRange()"
            class="label-metadata text-on-surface-dim flex items-center gap-1.5 mt-2"
          >
            <UIcon
              name="i-lucide-clock"
              class="size-3.5"
            />
            {{ formatRange() }}
          </p>
        </div>

        <p
          v-if="event.description"
          class="font-body text-body-md text-on-surface-dim whitespace-pre-line"
        >
          {{ event.description }}
        </p>

        <div>
          <div class="flex items-center gap-4 mb-6">
            <div class="h-px flex-1 bg-primary/30" />
            <h2 class="font-display text-headline-sm text-primary text-center">
              Sesiones del evento
            </h2>
            <div class="h-px flex-1 bg-primary/30" />
          </div>

          <div
            v-if="sessions.length === 0"
            class="p-4 text-sm text-slate-500 text-center"
          >
            Aún no hay sesiones publicadas para este evento.
          </div>
          <div
            v-else
            class="w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <LandingSessionCard
              v-for="session in sessions"
              :key="session.id"
              :session="session"
            />
          </div>
        </div>

        <p class="font-body text-body-sm text-on-surface-dim text-center">
          Evento creado el {{ formatDate(event.created_at) }}
        </p>
      </article>
    </div>
  </div>
</template>

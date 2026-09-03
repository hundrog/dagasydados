<script setup lang="ts">
import type { GameSessionWithMaster } from '~/types/session'

const props = defineProps<{
  event: GameSessionWithMaster['event'] & { name: string }
  sessions: GameSessionWithMaster[]
}>()

const formatRange = () => {
  const start = new Date(props.event.start_datetime)
  const end = new Date(props.event.end_datetime)
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
</script>

<template>
  <div class="mb-10">
    <div class="flex items-center gap-4 mb-4">
      <div class="h-px flex-1 bg-primary/30" />
      <div class="flex flex-col items-center gap-0.5 text-center">
        <span class="label-metadata text-primary flex items-center gap-1.5">
          <UIcon
            name="i-lucide-calendar-days"
            class="size-3.5"
          />
          Evento
        </span>
        <h2 class="font-display text-headline-sm text-primary leading-tight truncate max-w-full">
          {{ props.event.name }}
        </h2>
        <span
          v-if="formatRange()"
          class="label-metadata text-on-surface-dim flex items-center gap-1.5"
        >
          <UIcon
            name="i-lucide-clock"
            class="size-3"
          />
          {{ formatRange() }}
        </span>
      </div>
      <div class="h-px flex-1 bg-primary/30" />
    </div>

    <p
      v-if="props.event.description"
      class="text-center text-sm text-on-surface-dim mb-6 max-w-2xl mx-auto"
    >
      {{ props.event.description }}
    </p>

    <div class="w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <LandingSessionCard
        v-for="session in props.sessions"
        :key="session.id"
        :session="session"
      />
    </div>
  </div>
</template>

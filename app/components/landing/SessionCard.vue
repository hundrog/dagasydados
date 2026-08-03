<script setup lang="ts">
import type { GameSessionWithMaster } from '~/types/session'

const props = defineProps<{ session: GameSessionWithMaster }>()

const placeholderUrl = 'https://placehold.co/600x340/1e174a/9fa7ff?text=Sin+imagen'

const formatDate = (value: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const formatTime = (value: string | null) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }
  return value.slice(0, 5)
}

const scheduleLabel = computed(() => {
  const date = formatDate(props.session.fecha_inicio)
  const start = formatTime(props.session.hora_inicio)
  const end = formatTime(props.session.hora_fin)
  if (!date && !start && !end) return ''
  if (date && start && end) return `${date} · ${start} - ${end}`
  if (date && start) return `${date} · ${start}`
  if (date) return date
  return `${start}${end ? ` - ${end}` : ''}`
})

const modeColor = computed(() => {
  switch (props.session.mode) {
    case 'online':
      return 'bg-success/10 text-success'
    case 'offline':
      return 'bg-error/10 text-error'
    case 'hybrid':
      return 'bg-primary/10 text-primary'
    default:
      return 'bg-surface-variant/10 text-on-surface-variant'
  }
})

const modeIcon = computed(() => {
  switch (props.session.mode) {
    case 'online':
      return 'i-lucide-wifi'
    case 'offline':
      return 'i-lucide-map-pin'
    case 'hybrid':
      return 'i-lucide-wifi'
    default:
      return 'i-lucide-help-circle'
  }
})

const modeLabel = computed(() => {
  switch (props.session.mode) {
    case 'online':
      return 'Online'
    case 'offline':
      return 'Presencial'
    case 'hybrid':
      return 'Híbrido'
    default:
      return 'Desconocido'
  }
})
</script>

<template>
  <NuxtLink
    class="card group flex flex-col overflow-hidden card-hoverable"
  >
    <div class="relative h-48 overflow-hidden shrink-0">
      <img
        :src="session.image_url && session.image_url.length > 0 ? session.image_url : placeholderUrl"
        :alt="session.title"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      >
      <div
        class="absolute inset-0 bg-linear-to-t from-surface-high via-surface-high/20 to-transparent"
      />

      <div class="absolute top-3 right-3 flex flex-col items-end gap-1.5">
        <span
          class="label-metadata flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-sm"
          :class="modeColor"
        >
          <UIcon
            :name="modeIcon"
            class="size-3"
          />
          {{ modeLabel }}
        </span>
      </div>
    </div>

    <div class="flex flex-col flex-1 p-5 gap-3">
      <div class="flex justify-start items-center flex-wrap gap-3">
        <UBadge>
          {{ session.system }}
        </UBadge>
        <UBadge
          color="secondary"
          variant="outline"
        >
          {{ session.session_type }}
        </UBadge>
        <UBadge
          color="neutral"
          variant="outline"
        >
          {{ session.audience ? session.audience : 'Todos los públicos' }}
        </UBadge>
      </div>

      <div class="flex flex-col w-full">
        <span class="label-metadata text-secondary items-center gap-1.5 flex">
          <UIcon
            name="i-lucide-users"
            class="size-3 text-on-surface-dim shrink-0"
          />
          {{ session.current_players }} / {{ session.max_players }}
        </span>
        <span class="label-metadata items-center">
          <UIcon
            name="i-lucide-map-pin"
            class="size-3 text-on-surface-dim shrink-0"
          />
          {{ session.location }}
        </span>
        <span class="label-metadata text-muted items-center">
          <UIcon
            name="i-lucide-clock"
            class="size-3 text-on-surface-dim shrink-0"
          />
          {{ scheduleLabel }}
        </span>
      </div>
      <h2
        class="font-display text-headline-sm text-on-surface leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200"
      >
        {{ session.title }}
      </h2>

      <p class="font-body text-body-sm text-on-surface-dim line-clamp-3 flex-1">
        {{ session.description }}
      </p>

      <span class="font-display text-primary">
        Costo: {{ session.costo ? `$${session.costo}/persona` : 'Gratis' }}
      </span>

      <div
        class="flex items-center justify-between pt-3 mt-auto border-t border-outline-variant/10"
      >
        <div class="flex items-center gap-2 min-w-0">
          <img
            v-if="session.master?.avatar_url"
            :src="session.master.avatar_url"
            :alt="
              session.master.full_name
                || session.master.user_name
            "
            class="size-6 rounded-full object-cover shrink-0"
          >
          <div
            v-else
            class="size-6 rounded-full bg-surface-variant flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-lucide-user"
              class="size-3 text-on-surface-dim"
            />
          </div>

          <span class="font-body text-label-sm text-on-surface-dim truncate">
            {{
              session.master?.user_name
                ? `@${session.master.user_name}`
                : (session.master?.full_name)
            }}
          </span>
        </div>
      </div>

      <div class="max-w">
        <LandingReserveForm
          :session-id="session.id"
          :max-players="session.max_players"
          :current-players="session.current_players"
          :phone="session.master?.phone || ''"
          :master-name="session.master?.user_name || ''"
          :session-type="session.session_type"
          :session-title="session.title"
          @reserved="emit('reserved')"
        />
      </div>
    </div>
  </NuxtLink>
</template>

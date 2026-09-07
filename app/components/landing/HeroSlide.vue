<script setup lang="ts">
import type { Event } from '~/types/event'
import { formatEventRange } from '~/composables/useEventFormat'

const props = defineProps<{ event: Event }>()

const placeholderUrl = 'https://placehold.co/1600x900/1e174a/9fa7ff?text=Sin+imagen'
</script>

<template>
  <div class="relative min-h-130 flex items-center justify-center px-4 overflow-hidden">
    <NuxtLink
      :to="`/events/${props.event.slug ?? props.event.id}`"
      class="absolute inset-0 block group"
      :aria-label="props.event.name"
    >
      <img
        :src="props.event.image_url && props.event.image_url.length > 0 ? props.event.image_url : placeholderUrl"
        :alt="props.event.name"
        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      >
    </NuxtLink>

    <div
      v-if="props.event.show_text"
      class="relative z-10 w-full max-w-3xl mx-auto text-center space-y-6 rounded-2xl bg-surface/70 backdrop-blur-md p-8 sm:p-10 border border-outline-variant/20"
    >
      <span class="label-metadata text-primary inline-flex items-center gap-2">
        <UIcon
          name="i-lucide-star"
          class="size-3.5"
        />
        Evento destacado
      </span>

      <NuxtLink
        :to="`/events/${props.event.slug ?? props.event.id}`"
        class="group"
      >
        <h2 class="font-display text-display-md sm:text-display-lg text-on-surface leading-tight group-hover:text-primary transition-colors duration-200">
          {{ props.event.name }}
        </h2>
      </NuxtLink>

      <span
        v-if="formatEventRange(props.event)"
        class="label-metadata text-on-surface-dim inline-flex items-center gap-1.5"
      >
        <UIcon
          name="i-lucide-clock"
          class="size-3.5"
        />
        {{ formatEventRange(props.event) }}
      </span>

      <p
        v-if="props.event.description"
        class="font-body text-body-lg text-on-surface-dim max-w-xl mx-auto line-clamp-2"
      >
        {{ props.event.description }}
      </p>
    </div>
  </div>
</template>

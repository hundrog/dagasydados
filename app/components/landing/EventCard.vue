<script setup lang="ts">
import type { Event } from '~/types/event'
import { formatEventRange } from '~/composables/useEventFormat'

const props = defineProps<{ event: Event }>()

const placeholderUrl = 'https://placehold.co/1600x900/1e174a/9fa7ff?text=Sin+imagen'
</script>

<template>
  <NuxtLink
    :to="`/events/${props.event.slug ?? props.event.id}`"
    class="card group flex flex-col lg:flex-row w-full overflow-hidden card-hoverable"
  >
    <div class="relative aspect-[16/9] lg:aspect-auto lg:w-3/5 overflow-hidden shrink-0">
      <img
        :src="props.event.image_url && props.event.image_url.length > 0 ? props.event.image_url : placeholderUrl"
        :alt="props.event.name"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      >
      <div class="absolute inset-0 bg-linear-to-t from-surface-high via-surface-high/20 to-transparent" />

      <div
        v-if="props.event.featured"
        class="absolute bottom-3 right-3"
      >
        <span class="label-metadata flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-sm bg-primary/90 text-white">
          <UIcon
            name="i-lucide-star"
            class="size-3"
          />
          Destacado
        </span>
      </div>
    </div>

    <div class="flex flex-col flex-1 p-6 gap-3">
      <span
        v-if="formatEventRange(props.event)"
        class="label-metadata text-muted flex items-center gap-1.5"
      >
        <UIcon
          name="i-lucide-clock"
          class="size-3.5 text-on-surface-dim"
        />
        {{ formatEventRange(props.event) }}
      </span>

      <h2
        class="font-display text-headline-sm text-on-surface leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200"
      >
        {{ props.event.name }}
      </h2>

      <p class="font-body text-body-sm text-on-surface-dim line-clamp-3 flex-1">
        {{ props.event.description }}
      </p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Event } from '~/types/event'

const supabase = useSupabaseClient()

const featured = ref<Event[]>([])
const isLoading = ref(true)

const singleFeatured = computed(() => featured.value.length === 1 ? featured.value[0] : null)

const loadFeatured = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('featured', true)
    .order('fecha_inicio', { ascending: true })

  if (!error) {
    featured.value = (data ?? []) as Event[]
  }

  isLoading.value = false
}

onMounted(() => {
  loadFeatured()
})
</script>

<template>
  <section class="relative">
    <UCarousel
      v-if="featured.length > 1"
      :items="featured"
      fade
      loop
      arrows
      dots
      :autoplay="{ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true }"
      :ui="{
        prev: 'start-3 sm:start-6 top-1/2 -translate-y-1/2 z-20',
        next: 'end-3 sm:end-6 top-1/2 -translate-y-1/2 z-20',
        dots: 'absolute inset-x-0 bottom-4 z-20'
      }"
    >
      <template #default="{ item }">
        <LandingHeroSlide :event="item" />
      </template>
    </UCarousel>

    <LandingHeroSlide
      v-else-if="singleFeatured"
      :event="singleFeatured"
    />

    <div
      v-else
      class="relative aspect-[16/9] w-full flex flex-col items-center justify-center px-4 overflow-hidden"
    >
      <div class="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80"
          alt=""
          class="w-full h-full object-cover object-center"
        >
        <div class="absolute inset-0 bg-surface/60" />
        <div
          class="absolute inset-0"
          style="
            background: radial-gradient(
              ellipse at center,
              transparent 0%,
              transparent 50%,
              #0d072e 65%
            );
          "
        />
      </div>
      <div class="relative z-10 w-full text-center space-y-6">
        <span class="label-metadata text-primary inline-flex items-center gap-2">
          <UIcon
            name="i-lucide-compass"
            class="size-3"
          />
          Tu portal a la mejor cartelera de rol
        </span>

        <h1 class="font-display text-display-md sm:text-display-lg text-on-surface leading-tight">
          Cartelera de
          <span class="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
            Sesiones
          </span>
        </h1>

        <p class="font-body text-body-lg text-on-surface-dim max-w-xl mx-auto">
          Encuentra campañas y one-shots de Daggerheart y otros sistemas RPG.
          Aparta tu lugar, prepara tus dados y únete a la comunidad más activa.
        </p>
      </div>
    </div>
  </section>
</template>

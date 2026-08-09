<script setup lang="ts">
import type { GameSessionWithMaster } from '~/types/session'

const route = useRoute()
const supabase = useSupabaseClient()
const { isAdmin } = useIsAdmin()
const user = useSupabaseUser()

const session = ref<GameSessionWithMaster | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const canModify = (session: GameSessionWithMaster) => isAdmin.value || session.master_id === user.value?.sub

const {
  formatDate,
  scheduleLabel,
  recurrenceLabel,
  currentPlayers,
  modeColor,
  modeIcon,
  modeLabel
} = useSessionFormat(session)

const placeholderUrl = 'https://placehold.co/600x450/1e174a/9fa7ff?text=Sin+imagen'

const loadSession = async () => {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*,session_players(count),master:dagger_masters(id,full_name,user_name,avatar_url,phone)')
    .eq('id', String(route.params.id))
    .maybeSingle()

  if (error) {
    errorMessage.value = error.message
  } else if (!data) {
    errorMessage.value = 'No se encontró la sesión'
  } else {
    session.value = data as unknown as GameSessionWithMaster
  }

  isLoading.value = false
}

onMounted(() => {
  loadSession()
})

const goBack = () => {
  navigateTo('/#mesas')
}
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="max-w-4xl mx-auto px-4 py-8">
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
          v-if="session && canModify(session)"
          label="Editar"
          icon="i-lucide-pencil"
          color="neutral"
          variant="ghost"
          class="cursor-pointer mb-6"
          :to="`/admin/sessions/${session.id}/edit`"
        />
      </div>

      <div
        v-if="isLoading"
        class="p-4 text-sm text-slate-500"
      >
        Cargando sesión...
      </div>
      <div
        v-else-if="errorMessage"
        class="p-4 text-sm text-red-600"
      >
        {{ errorMessage }}
      </div>

      <article
        v-else-if="session"
        class="space-y-8"
      >
        <div class="relative aspect-[4/3] overflow-hidden rounded-xl">
          <img
            :src="session.image_url && session.image_url.length > 0 ? session.image_url : placeholderUrl"
            :alt="session.title"
            class="w-full h-full object-cover"
          >
          <div class="absolute inset-0 bg-linear-to-t from-surface-high via-surface-high/20 to-transparent" />
        </div>

        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <h1 class="font-display text-display-sm text-on-surface leading-tight">
              {{ session.title }}
            </h1>
            <p
              v-if="session.campaign"
              class="font-body text-body-sm text-on-surface-dim mt-1"
            >
              Campaña: {{ session.campaign }}
            </p>
          </div>

          <div class="shrink-0 flex flex-col items-end gap-2">
            <span class="font-display text-primary text-headline-sm">
              {{ session.costo ? `$${session.costo}/persona` : 'Gratis' }}
            </span>

            <span
              class="label-metadata flex items-center gap-1.5 px-2.5 py-1 rounded-md"
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

        <div class="flex flex-wrap gap-2">
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

        <p
          v-if="session.description"
          class="font-body text-body-md text-on-surface-dim whitespace-pre-line"
        >
          {{ session.description }}
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="card p-4 space-y-3">
            <h2 class="font-display text-headline-sm text-on-surface">
              Detalles
            </h2>
            <div class="space-y-2">
              <div class="label-metadata text-on-surface-dim flex items-center gap-2">
                <UIcon
                  name="i-lucide-users"
                  class="size-3 text-on-surface-dim shrink-0"
                />
                {{ currentPlayers }} / {{ session.max_players }} jugadores
              </div>
              <div class="label-metadata text-on-surface-dim flex items-center gap-2">
                <UIcon
                  name="i-lucide-map-pin"
                  class="size-3 text-on-surface-dim shrink-0"
                />
                {{ session.location }}
              </div>
              <div class="label-metadata text-on-surface-dim flex items-center gap-2">
                <UIcon
                  name="i-lucide-clock"
                  class="size-3 text-on-surface-dim shrink-0"
                />
                {{ scheduleLabel }}
              </div>
              <div
                v-if="recurrenceLabel"
                class="label-metadata text-on-surface-dim flex items-center gap-2"
              >
                <UIcon
                  name="i-lucide-repeat"
                  class="size-3 text-on-surface-dim shrink-0"
                />
                {{ recurrenceLabel }}
              </div>
              <div
                v-if="session.zona_horaria"
                class="label-metadata text-on-surface-dim flex items-center gap-2"
              >
                <UIcon
                  name="i-lucide-globe"
                  class="size-3 text-on-surface-dim shrink-0"
                />
                {{ session.zona_horaria }}
              </div>
            </div>
          </div>

          <div class="card p-4 space-y-3">
            <h2 class="font-display text-headline-sm text-on-surface">
              Master
            </h2>
            <div class="flex items-center gap-3">
              <img
                v-if="session.master?.avatar_url"
                :src="session.master.avatar_url"
                :alt="session.master.full_name || session.master.user_name"
                class="size-10 rounded-full object-cover shrink-0"
              >
              <div
                v-else
                class="size-10 rounded-full bg-surface-variant flex items-center justify-center shrink-0"
              >
                <UIcon
                  name="i-lucide-user"
                  class="size-4 text-on-surface-dim"
                />
              </div>
              <div class="min-w-0">
                <p class="font-body text-body-md text-on-surface truncate">
                  {{ session.master?.user_name ? `@${session.master.user_name}` : (session.master?.full_name) }}
                </p>
                <p
                  v-if="session.master?.full_name && session.master.user_name"
                  class="font-body text-body-sm text-on-surface-dim truncate"
                >
                  {{ session.master.full_name }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <h2 class="font-display text-headline-sm text-on-surface mb-2">
            Aparta tu lugar
          </h2>
          <p class="font-body text-body-sm text-on-surface-dim mb-4">
            Confirma tu nombre y teléfono. Al reservar, se abre WhatsApp con el master para coordinar tu lugar.
          </p>
          <LandingReserveForm
            :session-id="session.id"
            :max-players="session.max_players"
            :current-players="currentPlayers"
            :phone="session.master?.phone || ''"
            :master-name="session.master?.user_name || ''"
            :session-type="session.session_type ?? undefined"
            :session-title="session.title"
          />
        </div>

        <p class="font-body text-body-sm text-on-surface-dim text-center">
          Sesión creada el {{ formatDate(session.created_at) }}
        </p>
      </article>
    </div>
  </div>
</template>

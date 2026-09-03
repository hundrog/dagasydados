<script setup lang="ts">
import type { Master, MasterProfile } from '~/types/master'
import type { GameSessionWithMaster } from '~/types/session'

const route = useRoute()
const supabase = useSupabaseClient()
const { isAdmin } = storeToRefs(useAdminStore())
const user = useSupabaseUser()

const master = ref<Master | null>(null)
const sessions = ref<GameSessionWithMaster[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const masterId = computed(() => String(route.params.id))
const isOwnProfile = computed(() => masterId.value === user.value?.sub)
const canEdit = computed(() => isAdmin.value || isOwnProfile.value)

const toUrl = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed || /\s/.test(trimmed)) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.(?!\d)[a-z0-9-]{2,}(\.\S*)?/i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return null
}

const paymentName = computed(() => master.value?.plataforma_pago?.trim() || '')
const paymentCuenta = computed(() => master.value?.plataforma_pago_cuenta?.trim() || '')
const paymentCuentaUrl = computed(() => toUrl(paymentCuenta.value))
const hasPayment = computed(() => Boolean(paymentName.value || paymentCuenta.value))

const profile = computed(() => master.value?.profile as MasterProfile | null)

const estiloKeys = ['narrativo', 'tactico', 'roll', 'puzzle'] as const
type EstiloKey = typeof estiloKeys[number]

const estiloMeta: Record<EstiloKey, { label: string, description: string, icon: string }> = {
  narrativo: { label: 'Narrativo', description: 'Historias, personajes y arcos narrativos', icon: 'i-lucide-book-open' },
  tactico: { label: 'Táctico', description: 'Combate, mapa y decisiones tácticas', icon: 'i-lucide-swords' },
  roll: { label: 'Roll', description: 'Roleo, interpretación e inmersión', icon: 'i-lucide-message-square-quote' },
  puzzle: { label: 'Puzzle', description: 'Acertijos, enigmas y exploración', icon: 'i-lucide-puzzle' }
}

const sortedEstilos = computed(() => {
  if (!profile.value?.estilo_juego) return []
  const estilo = profile.value.estilo_juego
  return [...estiloKeys].sort((a, b) => (estilo[a] ?? 4) - (estilo[b] ?? 4))
})

const hasProfile = computed(() => {
  if (!profile.value) return false
  const { estilo_juego, homebrew, referencias } = profile.value
  const hasEstilo = estilo_juego && Object.values(estilo_juego).some(v => v != null)
  const hasHomebrew = (homebrew?.mecanicas?.trim() || homebrew?.mundo?.trim())
  const hasReferencias = (referencias?.peliculas?.length || referencias?.libros?.length || referencias?.videojuegos?.length || referencias?.series_anime?.length)
  return hasEstilo || hasHomebrew || hasReferencias
})

const isSessionActive = (session: GameSessionWithMaster): boolean => {
  const start = parseLocalDate(session.fecha_inicio)
  if (!start) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!session.rrule) {
    return start >= today
  }

  const rule = parseSessionRule(session.rrule, start)
  if (!rule) return start >= today

  const until = rule.origOptions.until
  if (until && until < today) return false

  const after = rule.after(new Date(today.getTime() - 86400000), true)
  return after != null
}

const activeSessions = computed(() =>
  sessions.value.filter(isSessionActive).sort((a, b) =>
    (parseLocalDate(a.fecha_inicio)?.getTime() ?? 0) - (parseLocalDate(b.fecha_inicio)?.getTime() ?? 0)
  )
)

const loadData = async () => {
  isLoading.value = true
  errorMessage.value = null

  const [masterResult, sessionsResult] = await Promise.all([
    supabase
      .from('dagger_masters')
      .select('id,full_name,user_name,phone,avatar_url,plataforma_pago,plataforma_pago_cuenta,descripcion,profile,status')
      .eq('id', masterId.value)
      .maybeSingle(),
    supabase
      .from('game_sessions')
      .select('id,title,system,session_type,audience,mode,image_url,max_players,location,description,costo,fecha_inicio,hora_inicio,hora_fin,rrule,zona_horaria,created_at,master:dagger_masters(id,full_name,user_name,avatar_url,phone)')
      .eq('master_id', masterId.value)
      .eq('status', 'published')
  ])

  if (masterResult.error) {
    errorMessage.value = masterResult.error.message
  } else if (!masterResult.data) {
    errorMessage.value = 'No se encontró el master'
  } else {
    master.value = masterResult.data as unknown as Master
  }

  if (!sessionsResult.error && sessionsResult.data) {
    const rawSessions = sessionsResult.data as unknown as GameSessionWithMaster[]

    const counts = await Promise.all(
      rawSessions.map(async (s) => {
        const { data } = await supabase.rpc('session_player_count', { p_session_id: s.id })
        return { id: s.id, count: data ?? 0 }
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
  loadData()
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
          v-if="master && canEdit"
          label="Editar perfil"
          icon="i-lucide-pencil"
          color="neutral"
          variant="ghost"
          class="cursor-pointer mb-6"
          :to="`/admin/profile/${master.id}/edit`"
        />
      </div>

      <div
        v-if="isLoading"
        class="p-4 text-sm text-slate-500"
      >
        Cargando perfil...
      </div>
      <div
        v-else-if="errorMessage"
        class="p-4 text-sm text-red-600"
      >
        {{ errorMessage }}
      </div>

      <article
        v-else-if="master"
        class="space-y-8"
      >
        <div class="flex items-center gap-5">
          <img
            v-if="master.avatar_url"
            :src="master.avatar_url"
            :alt="master.full_name || master.user_name"
            class="size-24 rounded-full object-cover shrink-0"
          >
          <div
            v-else
            class="size-24 rounded-full bg-surface-variant flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-lucide-user"
              class="size-10 text-on-surface-dim"
            />
          </div>
          <div class="min-w-0">
            <p class="font-display text-headline-sm text-on-surface">
              {{ master.user_name ? `@${master.user_name}` : (master.full_name) }}
            </p>
            <p
              v-if="master.full_name && master.user_name"
              class="font-body text-body-md text-on-surface-dim mt-0.5"
            >
              {{ master.full_name }}
            </p>
          </div>
        </div>

        <p
          v-if="master.descripcion"
          class="font-body text-body-lg text-on-surface whitespace-pre-line leading-relaxed"
        >
          {{ master.descripcion }}
        </p>

        <div
          v-if="hasPayment"
          class="card p-4 space-y-2"
        >
          <h2 class="font-display text-headline-sm text-on-surface">
            Datos de pago
          </h2>
          <div class="label-metadata text-on-surface-dim flex items-center gap-1.5">
            <UIcon
              name="i-lucide-credit-card"
              class="size-3 shrink-0"
            />
            <span v-if="paymentName">
              {{ paymentName }}{{ paymentCuenta ? ':' : '' }}
            </span>
            <a
              v-if="paymentCuentaUrl"
              :href="paymentCuentaUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="underline hover:text-on-surface break-all"
            >
              {{ paymentCuenta }}
            </a>
            <span v-else-if="paymentCuenta">
              {{ paymentCuenta }}
            </span>
          </div>
        </div>

        <template v-if="hasProfile">
          <div
            v-if="sortedEstilos.length > 0"
            class="card p-4 space-y-3"
          >
            <h2 class="font-display text-headline-sm text-on-surface">
              Estilo de juego
            </h2>
            <ul class="space-y-2">
              <li
                v-for="(key, index) in sortedEstilos"
                :key="key"
                class="flex items-center gap-3"
              >
                <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-variant text-xs font-bold text-primary">
                  {{ index + 1 }}
                </span>
                <UIcon
                  :name="estiloMeta[key].icon"
                  class="size-4 shrink-0 text-secondary"
                />
                <div class="min-w-0">
                  <span class="font-body text-body-sm text-on-surface font-medium">
                    {{ estiloMeta[key].label }}
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <div
            v-if="profile?.homebrew?.mecanicas?.trim() || profile?.homebrew?.mundo?.trim()"
            class="card p-4 space-y-3"
          >
            <h2 class="font-display text-headline-sm text-on-surface">
              Homebrew
            </h2>
            <div
              v-if="profile.homebrew.mecanicas?.trim()"
              class="space-y-1"
            >
              <h3 class="label-metadata text-on-surface-dim">
                Mecánicas
              </h3>
              <p class="font-body text-body-sm text-on-surface whitespace-pre-line">
                {{ profile.homebrew.mecanicas }}
              </p>
            </div>
            <div
              v-if="profile.homebrew.mundo?.trim()"
              class="space-y-1"
            >
              <h3 class="label-metadata text-on-surface-dim">
                Mundo
              </h3>
              <p class="font-body text-body-sm text-on-surface whitespace-pre-line">
                {{ profile.homebrew.mundo }}
              </p>
            </div>
          </div>

          <div
            v-if="profile?.referencias && (profile.referencias.peliculas?.length || profile.referencias.libros?.length || profile.referencias.videojuegos?.length || profile.referencias.series_anime?.length)"
            class="card p-4 space-y-3"
          >
            <h2 class="font-display text-headline-sm text-on-surface">
              Referencias
            </h2>
            <div
              v-for="(items, category) in { 'Películas': profile.referencias.peliculas, 'Libros': profile.referencias.libros, 'Videojuegos': profile.referencias.videojuegos, 'Series y anime': profile.referencias.series_anime }"
              v-show="items?.length"
              :key="category"
              class="space-y-1.5"
            >
              <h3 class="label-metadata text-on-surface-dim">
                {{ category }}
              </h3>
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="item in items"
                  :key="item"
                  color="secondary"
                  variant="outline"
                >
                  {{ item }}
                </UBadge>
              </div>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <h2 class="font-display text-headline-sm text-on-surface">
            Sesiones de {{ master.user_name ? `@${master.user_name}` : (master.full_name || 'este master') }}
          </h2>
          <div
            v-if="activeSessions.length === 0"
            class="p-4 text-sm text-slate-500 text-center"
          >
            Este master aún no tiene sesiones publicadas.
          </div>
          <div
            v-else
            class="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            <LandingSessionCard
              v-for="session in activeSessions"
              :key="session.id"
              :session="session"
            />
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

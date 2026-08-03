<script setup lang="ts">
import type { GameSessionWithMaster } from '~/types/session'

const supabase = useSupabaseClient()

const sessions = ref<GameSessionWithMaster[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const loadSessions = async () => {
  isLoading.value = true
  errorMessage.value = null

  const { data, error } = await supabase
    .from('game_sessions')
    .select('id,title,system,session_type,audience,mode,image_url,current_players,max_players,location,description,costo,hora_inicio,hora_fin,master:dagger_masters(id,full_name,user_name,avatar_url,phone)')

  if (error) {
    errorMessage.value = error.message
  } else {
    sessions.value = (data ?? []) as unknown as GameSessionWithMaster[]
  }

  isLoading.value = false
}

onMounted(() => {
  loadSessions()
})
</script>

<template>
  <div
    v-if="isLoading"
    class="p-4 text-sm text-slate-500 text-center"
  >
    Cargando sesiones...
  </div>
  <div
    v-else-if="errorMessage"
    class="p-4 text-sm text-red-600 text-center"
  >
    {{ errorMessage }}
  </div>
  <div
    v-else-if="sessions.length === 0"
    class="p-4 text-sm text-slate-500 text-center"
  >
    Aún no hay sesiones publicadas.
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
</template>

<script setup lang="ts">
import type { GameSession } from '~/types/session'
import SessionForm from '~/components/admin/SessionForm.vue'

const route = useRoute()
const supabase = useSupabaseClient()

const sessionId = computed(() => String(route.params.id))
const isNew = computed(() => sessionId.value === 'new')

const session = ref<GameSession | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const loadSession = async (id: string) => {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    errorMessage.value = error.message
    return
  }

  if (!data) {
    errorMessage.value = 'No se encontró la sesión'
    return
  }

  session.value = data as GameSession
}

onMounted(async () => {
  if (!isNew.value) {
    await loadSession(sessionId.value)
  }
  isLoading.value = false
})

const onSaved = () => {
  navigateTo('/admin/sessions')
}

const goBack = () => {
  navigateTo('/admin/sessions')
}
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-primary-600">
            {{ isNew ? 'Nueva sesión' : 'Editar sesión' }}
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            {{ isNew ? 'Crea una nueva sesión de juego.' : 'Modifica los datos de la sesión.' }}
          </p>
        </div>
        <UButton
          label="Volver"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          class="cursor-pointer"
          @click="goBack"
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
      <SessionForm
        v-else
        :session="session"
        @saved="onSaved"
        @cancel="goBack"
      />
    </div>
  </div>
</template>

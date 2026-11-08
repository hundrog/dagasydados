import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

/**
 * Indica si el usuario autenticado ya tiene una reserva en la sesión.
 * La RLS de `session_players` permite al jugador leer únicamente sus filas.
 */
export const useSessionRegistration = (sessionId: MaybeRefOrGetter<string>) => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const isRegistered = ref(false)
  const isChecking = ref(false)

  const refresh = async () => {
    const userId = user.value?.sub
    if (!userId) {
      isRegistered.value = false
      return
    }

    isChecking.value = true
    try {
      const { data, error } = await supabase
        .from('session_players')
        .select('id')
        .eq('game_session_id', toValue(sessionId))
        .eq('user_id', userId)
        .maybeSingle()

      isRegistered.value = !error && data !== null
    } finally {
      isChecking.value = false
    }
  }

  watch(
    [() => user.value?.sub, () => toValue(sessionId)],
    () => {
      void refresh()
    },
    { immediate: true }
  )

  return {
    isRegistered,
    isChecking,
    refresh,
    markRegistered: () => {
      isRegistered.value = true
    }
  }
}

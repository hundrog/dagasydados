import type { Master } from '~/types/master'

export const useCurrentMasterStore = defineStore('currentMaster', () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const master = ref<Pick<Master, 'id' | 'full_name' | 'user_name' | 'avatar_url'> | null>(null)
  const isLoading = ref(false)
  let pendingPromise: Promise<void> | null = null

  const refresh = (): Promise<void> => {
    if (pendingPromise) return pendingPromise

    const userId = user.value?.sub
    if (!userId) {
      master.value = null
      return Promise.resolve()
    }

    isLoading.value = true
    pendingPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('dagger_masters')
          .select('id,full_name,user_name,avatar_url')
          .eq('id', userId)
          .maybeSingle()

        master.value = error ? null : (data ?? null)
      } finally {
        isLoading.value = false
        pendingPromise = null
      }
    })()

    return pendingPromise
  }

  watch(
    () => user.value,
    () => {
      void refresh()
    },
    { immediate: true }
  )

  return {
    master,
    isLoading,
    refresh
  }
})

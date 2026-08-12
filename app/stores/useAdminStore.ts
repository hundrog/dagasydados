export const useAdminStore = defineStore('admin', () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const isAdmin = ref(false)
  const isLoading = ref(false)
  let pendingPromise: Promise<void> | null = null

  const refresh = (): Promise<void> => {
    if (pendingPromise) return pendingPromise

    const userId = user.value?.sub
    if (!userId) {
      isAdmin.value = false
      return Promise.resolve()
    }

    isLoading.value = true
    pendingPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('id')
          .eq('id', userId)
          .maybeSingle()

        isAdmin.value = !error && data !== null
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
    isAdmin,
    isLoading,
    refresh
  }
})

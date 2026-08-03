import type { Ref } from 'vue'

export function useIsAdmin() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const isAdmin = ref(false)
  const isLoading = ref(false)

  const refresh = async (): Promise<void> => {
    if (!user.value) {
      isAdmin.value = false
      return
    }

    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.value.sub)
        .maybeSingle()

      isAdmin.value = !error && data !== null
    } finally {
      isLoading.value = false
    }
  }

  watch(
    () => user.value,
    async () => {
      await refresh()
    },
    { immediate: true }
  )

  return {
    isAdmin: isAdmin as Readonly<Ref<boolean>>,
    isLoading,
    refresh
  }
}

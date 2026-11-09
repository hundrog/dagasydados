import type { MasterStatus, ProfileRole } from '~/types/master'

export const useCurrentProfileStore = defineStore('currentProfile', () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const master = ref<{ id: string, full_name: string | null, user_name: string | null, email: string | null, avatar_url: string | null, phone: string | null, status: MasterStatus, role: ProfileRole } | null>(null)
  const isLoading = ref(false)
  let pendingPromise: Promise<void> | null = null
  let lastRefreshedUserId: string | null = null

  const refresh = (): Promise<void> => {
    if (pendingPromise) return pendingPromise

    const userId = user.value?.sub
    if (!userId) {
      master.value = null
      lastRefreshedUserId = null
      return Promise.resolve()
    }

    if (userId === lastRefreshedUserId && master.value) {
      return Promise.resolve()
    }

    isLoading.value = true
    pendingPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('dagger_masters')
          .select('id,full_name,user_name,email,avatar_url,phone,status,role')
          .eq('id', userId)
          .maybeSingle()

        const row = data as { id: string, full_name: string | null, user_name: string | null, email: string | null, avatar_url: string | null, phone: string | null, status: MasterStatus, role: ProfileRole | null } | null
        master.value = error || !row
          ? null
          : {
              ...row,
              role: (row.role ?? (row.status === 'authorized' ? 'master' : 'player')) as ProfileRole
            }
        if (master.value) lastRefreshedUserId = userId
      } finally {
        isLoading.value = false
        pendingPromise = null
      }
    })()

    return pendingPromise
  }

  const isAuthorized = computed(() => master.value?.status === 'authorized')
  const isMaster = computed(() => master.value?.role === 'master' || master.value?.status === 'authorized')
  const canRequestMaster = computed(() => master.value?.status === 'created' && master.value?.role === 'player')

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
    isAuthorized,
    isMaster,
    canRequestMaster,
    refresh
  }
})

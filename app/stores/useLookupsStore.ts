export interface LookupMode {
  label: string
  value: string
}

export interface Lookups {
  systems: string[]
  session_types: string[]
  audiences: string[]
  modes: LookupMode[]
}

export const useLookupsStore = defineStore('lookups', () => {
  const lookups = ref<Lookups | null>(null)
  const isLoading = ref(false)
  let pendingPromise: Promise<Lookups> | null = null

  const refresh = (): Promise<Lookups> => {
    if (lookups.value) return Promise.resolve(lookups.value)
    if (pendingPromise) return pendingPromise

    pendingPromise = (async () => {
      try {
        const data = await $fetch<Lookups>('/api/lookups')
        lookups.value = data
        return data
      } finally {
        isLoading.value = false
        pendingPromise = null
      }
    })()

    return pendingPromise
  }

  return {
    lookups,
    isLoading,
    refresh
  }
})

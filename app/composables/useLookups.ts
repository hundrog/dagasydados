import type { Ref } from 'vue'

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

let cached: Lookups | null = null
let pendingPromise: Promise<Lookups> | null = null

export function useLookups() {
  const lookups = ref<Lookups | null>(cached)
  const isLoading = ref(cached === null)

  const refresh = (): Promise<Lookups> => {
    if (cached) return Promise.resolve(cached)
    if (pendingPromise) return pendingPromise

    pendingPromise = (async () => {
      try {
        const data = await $fetch<Lookups>('/api/lookups')
        cached = data
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
    lookups: lookups as Readonly<Ref<Lookups | null>>,
    isLoading: isLoading as Readonly<Ref<boolean>>,
    refresh
  }
}

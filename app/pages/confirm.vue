<script setup lang="ts">
const user = useSupabaseUser()
const redirectInfo = useSupabaseCookieRedirect()
const profileStore = useCurrentProfileStore()

watch(user, async () => {
  if (user.value) {
    const path = redirectInfo.pluck()
    if (path) {
      return navigateTo(path, { replace: true })
    }

    await profileStore.refresh()
    const destination = profileStore.master?.role === 'master' ? '/admin/profile' : '/account'
    return navigateTo(destination, { replace: true })
  } else {
    console.log('User is not logged in, redirecting to login page...')
    return navigateTo('/login', { replace: true })
  }
}, { immediate: true })
</script>

<template>
  <div class="flex-1 flex items-center justify-center min-h-[50vh]">
    <UIcon
      name="i-lucide-loader-circle"
      class="w-12 h-12 text-slate-500 animate-spin"
    />
  </div>
</template>

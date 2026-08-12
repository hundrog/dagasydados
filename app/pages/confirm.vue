<script setup lang="ts">
const user = useSupabaseUser()
const redirectInfo = useSupabaseCookieRedirect()

watch(user, () => {
  if (user.value) {
    // Get redirect path, and clear it from the cookie
    const path = redirectInfo.pluck()
    // Redirect to the saved path, or fallback to home
    return navigateTo(path || `/admin/profile/${user.value.sub}/edit`, { replace: true })
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

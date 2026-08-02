<script setup lang="ts">
const user = useSupabaseUser()

watch(user, () => {
  if (user.value) {
    // Redirect to protected page
    return navigateTo('/')
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

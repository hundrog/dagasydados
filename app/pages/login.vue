<script setup lang="ts">
const toast = useToast()
const supabase = useSupabaseClient()

const providers = [{
  label: 'Discord',
  icon: 'i-simple-icons-discord',
  onClick: () => {
    signInWithDiscord()
  }
}]

async function signInWithDiscord() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${window.location.origin}/confirm`
    }
  })

  if (error) {
    toast.add({
      title: 'Error',
      description: error.message,
      color: 'error'
    })
  } else {
    toast.add({
      title: 'Success',
      description: 'Redirecting to Discord for authentication...',
      color: 'success'
    })
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        title="Login"
        description="Inicia sesion con Discord para iniciar."
        icon="i-lucide-user"
        :providers="providers"
      />
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import { safeRedirectPath } from '~/utils/url'

const route = useRoute()
const toast = useToast()
const supabase = useSupabaseClient()
const redirectInfo = useSupabaseCookieRedirect()

// El destino puede llegar por querystring (header, blog, páginas de admin).
// Se guarda en la cookie que confirm.vue consume después del OAuth.
const redirectTarget = safeRedirectPath(route.query.redirect)
if (redirectTarget) {
  redirectInfo.path.value = redirectTarget
}

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

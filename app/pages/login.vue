<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

const toast = useToast()
const supabase = useSupabaseClient()

const _fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'Enter your email',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password',
  placeholder: 'Enter your password',
  required: true
}, {
  name: 'remember',
  label: 'Remember me',
  type: 'checkbox'
}]

const providers = [{
  label: 'Discord',
  icon: 'i-simple-icons-discord',
  onClick: () => {
    signInWithDiscord()
  }
}]

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string('Password is required').min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

function onSubmit(payload: FormSubmitEvent<Schema>) {
  console.log('Submitted', payload)
}

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
        :schema="schema"
        title="Login"
        description="Inicia sesion con Discord para iniciar."
        icon="i-lucide-user"
        :providers="providers"
        @submit="onSubmit"
      />
    </UPageCard>
  </div>
</template>

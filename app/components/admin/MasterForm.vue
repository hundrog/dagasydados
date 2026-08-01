<script setup lang="ts">
import * as z from 'zod'

const supabase = useSupabaseClient()
const emit = defineEmits<{
  created: []
}>()

const isOpen = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const schema = z.object({
  full_name: z.string().min(1, 'El nombre es obligatorio'),
  user_name: z.string().optional(),
  phone: z.string().optional(),
  avatar_url: z.url('Debe ser una URL válida').optional().or(z.literal(''))
})

type Schema = z.infer<typeof schema>

const state = reactive<Partial<Schema>>({
  full_name: '',
  user_name: '',
  phone: '',
  avatar_url: ''
})

const resetForm = () => {
  state.full_name = ''
  state.user_name = ''
  state.phone = ''
  state.avatar_url = ''
  errorMessage.value = null
  successMessage.value = null
}

async function submitMaster() {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = null
  successMessage.value = null

  const payload = {
    full_name: state.full_name?.trim() || null,
    user_name: state.user_name?.trim() || null,
    phone: state.phone?.trim() || null,
    avatar_url: state.avatar_url?.trim() ? state.avatar_url.trim() : null
  }

  const { error } = await supabase.from('dagger_masters').insert(payload)

  isSubmitting.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  successMessage.value = 'Master creado correctamente'
  resetForm()
  emit('created')
  isOpen.value = false
}
</script>

<template>
  <UModal v-model:open="isOpen" title="Nuevo master">
    <UButton label="Nuevo Master" icon="i-heroicons-plus" class="cursor-pointer" @click="isOpen = true" />

    <template #body>
      <UForm :schema="schema" :state="state" class="w-full space-y-4" @submit="submitMaster">
        <UFormField label="Nombre completo" name="full_name" required>
          <UInput v-model="state.full_name" class="w-full" />
        </UFormField>

        <UFormField label="Apodo" name="user_name">
          <UInput v-model="state.user_name" class="w-full" />
        </UFormField>

        <UFormField label="Teléfono" name="phone">
          <UInput v-model="state.phone" class="w-full" />
        </UFormField>

        <UFormField label="URL del avatar" name="avatar_url">
          <UInput v-model="state.avatar_url" class="w-full" />
        </UFormField>

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
        <p v-if="successMessage" class="text-sm text-green-600">{{ successMessage }}</p>

        <UButton type="submit" block :loading="isSubmitting" class="cursor-pointer">
          Guardar Master
        </UButton>
      </UForm>
    </template>
  </UModal>
</template>

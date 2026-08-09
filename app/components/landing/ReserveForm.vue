<script setup lang="ts">
import * as z from 'zod'

const props = defineProps<{
  masterName?: string
  phone?: string
  sessionType?: string
  sessionTitle?: string
  sessionId?: string
}>()

const supabase = useSupabaseClient()
const toast = useToast()
const isOpen = ref(false)
const isLoading = ref(false)

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  telefono: z.string().min(1, 'El telefono es requerido')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: '',
  telefono: ''
})

const message = computed(() => {
  const baseText = `Hola master ${props.masterName}, quiero reservar mi lugar en ${props.sessionTitle} (${props.sessionType})`
  const nameText = state.name?.trim() ? ` Mi nombre es ${state.name.trim()}.` : ''
  return encodeURIComponent(`${baseText}${nameText}`)
})

const wame = computed(() => {
  const number = props.phone?.replace(/\D/g, '') ?? ''
  return `https://wa.me/${number}?text=${message.value}`
})

async function handleReserve() {
  if (!props.phone || !props.sessionId || !state.name?.trim() || !state.telefono?.trim()) {
    return
  }

  isLoading.value = true

  const { error } = await supabase
    .from('session_players')
    .insert({
      game_session_id: props.sessionId,
      nombre: state.name.trim(),
      telefono: state.telefono.trim()
    })

  isLoading.value = false

  if (error) {
    if (error.code === '23505') {
      toast.add({
        title: 'Ya estas registrado',
        description: 'Este telefono ya esta registrado para esta sesion.',
        color: 'error',
        icon: 'i-lucide-octagon-x'
      })
    } else {
      toast.add({
        title: 'Error al reservar',
        description: error.message,
        color: 'error',
        icon: 'i-lucide-octagon-x'
      })
    }
    return
  } else if (import.meta.client) {
    window.open(wame.value, '_blank', 'noopener,noreferrer')
  }

  isOpen.value = false
  state.name = ''
  state.telefono = ''

  toast.add({
    title: 'Reserva registrada',
    color: 'success',
    icon: 'i-lucide-check'
  })
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="Reserva tu lugar"
  >
    <UButton
      block
      label="Aparta tu lugar"
      class="mt-3 cursor-pointer"
      @click.stop="isOpen = true"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4 w-full"
      >
        <UFormField
          label="Nombre o apodo"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Telefono"
          name="telefono"
          required
        >
          <UInput
            v-model="state.telefono"
            placeholder="+52 123 456 7890"
            class="w-full"
          />
        </UFormField>
        <USeparator class="my-8" />
        <UButton
          type="button"
          block
          :loading="isLoading"
          :disabled="!state.name?.length || !state.telefono?.length"
          class="cursor-pointer"
          @click="handleReserve"
        >
          Reservar
        </UButton>
      </UForm>
    </template>
  </UModal>
</template>

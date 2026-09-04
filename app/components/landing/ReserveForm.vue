<script setup lang="ts">
import * as z from 'zod'

const props = defineProps<{
  masterName?: string
  phone?: string
  sessionType?: string
  sessionTitle?: string
  sessionId?: string
  maxPlayers?: number | null
  currentPlayers?: number
}>()

const toast = useToast()
const isOpen = ref(false)
const isLoading = ref(false)

const isFull = computed(() =>
  props.maxPlayers != null && (props.currentPlayers ?? 0) >= props.maxPlayers
)

const canReserve = computed(() =>
  !!props.phone && !isFull.value
)

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(80),
  telefono: z.string().min(1, 'El telefono es requerido').max(20)
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
  if (!props.sessionId || !state.name?.trim() || !state.telefono?.trim()) {
    return
  }

  if (!canReserve.value) return

  isLoading.value = true

  const nombre = sanitizeName(state.name)
  const telefono = sanitizePhone(state.telefono)

  if (!nombre || !telefono) {
    isLoading.value = false
    toast.add({
      title: 'Datos de reserva inválidos',
      color: 'error',
      icon: 'i-lucide-octagon-x'
    })
    return
  }

  try {
    await $fetch('/api/reservations', {
      method: 'POST',
      body: { sessionId: props.sessionId, nombre, telefono }
    })
  } catch (error) {
    isLoading.value = false
    const err = error as { statusCode?: number, status?: number, data?: { message?: string } }
    const status = err.statusCode ?? err.status
    const description = err.data?.message

    if (status === 409) {
      toast.add({
        title: 'No se pudo reservar',
        description,
        color: 'error',
        icon: 'i-lucide-octagon-x'
      })
    } else if (status === 429) {
      toast.add({
        title: 'Demasiadas reservas',
        description,
        color: 'error',
        icon: 'i-lucide-octagon-x'
      })
    } else {
      toast.add({
        title: 'Error al reservar',
        description: description ?? 'Intenta de nuevo más tarde',
        color: 'error',
        icon: 'i-lucide-octagon-x'
      })
    }
    return
  }

  isLoading.value = false

  if (import.meta.client) {
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
      :disabled="!canReserve"
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
          :disabled="!canReserve || !state.name?.length || !state.telefono?.length"
          class="cursor-pointer"
          @click="handleReserve"
        >
          Reservar
        </UButton>
      </UForm>
    </template>
  </UModal>
</template>

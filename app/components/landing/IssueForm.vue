<script setup lang="ts">
import * as z from 'zod'

const toast = useToast()
const isOpen = ref(false)
const isLoading = ref(false)

const issueTypeItems = ISSUE_TYPES.map(type => ({
  label: issueTypeLabel(type),
  value: type
}))

const schema = z.object({
  title: z.string().min(1, 'El título es requerido').max(100),
  body: z.string().min(1, 'Describe el problema o la petición').max(500),
  issueType: z.enum(ISSUE_TYPES),
  contact: z.string().max(80).optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  title: '',
  body: '',
  issueType: 'bug',
  contact: ''
})

const canSubmit = computed(() =>
  !!state.title?.trim() && !!state.body?.trim() && !!state.issueType
)

function open() {
  state.title = ''
  state.body = ''
  state.issueType = 'bug'
  state.contact = ''
  isOpen.value = true
}

async function handleSubmit() {
  if (isLoading.value || !canSubmit.value) return

  isLoading.value = true

  try {
    const { url } = await $fetch<{ url: string }>('/api/issues', {
      method: 'POST',
      body: {
        title: state.title?.trim(),
        body: state.body?.trim(),
        issueType: state.issueType,
        contact: state.contact?.trim() || undefined
      }
    })

    isOpen.value = false
    toast.add({
      title: 'Reporte enviado',
      description: 'Gracias por reportar, lo revisaremos pronto.',
      color: 'success',
      icon: 'i-lucide-circle-check',
      actions: url
        ? [{
            label: 'Ver issue',
            onClick: () => window.open(url, '_blank', 'noopener,noreferrer')
          }]
        : []
    })
  } catch (error) {
    const err = error as { statusCode?: number, status?: number, data?: { message?: string } }
    const status = err.statusCode ?? err.status
    const description = err.data?.message

    toast.add({
      title: status === 429 ? 'Demasiados reportes' : 'Error al enviar el reporte',
      description: description ?? 'Intenta de nuevo más tarde',
      color: 'error',
      icon: 'i-lucide-octagon-x'
    })
  } finally {
    isLoading.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="Reporta un problema"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="w-full space-y-4"
      >
        <UFormField
          label="Título"
          name="title"
          required
        >
          <UInput
            v-model="state.title"
            class="w-full"
            placeholder="Resumen corto del problema"
          />
        </UFormField>

        <UFormField
          label="Tipo"
          name="issueType"
          required
        >
          <USelect
            v-model="state.issueType"
            :items="issueTypeItems"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Descripción"
          name="body"
          required
        >
          <UTextarea
            v-model="state.body"
            class="w-full"
            :rows="5"
            placeholder="¿Qué sucedió? ¿Qué esperabas que ocurriera?"
          />
        </UFormField>

        <UFormField
          label="Contacto (opcional)"
          name="contact"
        >
          <UInput
            v-model="state.contact"
            class="w-full"
            placeholder="Email o usuario para darte seguimiento"
          />
        </UFormField>

        <UButton
          type="button"
          block
          :loading="isLoading"
          :disabled="!canSubmit"
          class="cursor-pointer"
          @click="handleSubmit"
        >
          Enviar reporte
        </UButton>
      </UForm>
    </template>
  </UModal>
</template>

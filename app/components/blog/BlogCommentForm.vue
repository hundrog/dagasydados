<script setup lang="ts">
import { BLOG_COMMENT_MAX_LENGTH } from '~/types/blog'

const props = withDefaults(defineProps<{
  submitAction: (content: string) => Promise<unknown>
  initialValue?: string
  placeholder?: string
  submitLabel?: string
  showCancel?: boolean
  maxLength?: number
}>(), {
  initialValue: '',
  placeholder: 'Escribe un comentario...',
  submitLabel: 'Publicar',
  showCancel: false,
  maxLength: BLOG_COMMENT_MAX_LENGTH
})

const emit = defineEmits<{
  submitted: []
  cancel: []
}>()

const content = ref(props.initialValue)
const isSubmitting = ref(false)
const errorMessage = ref('')

const remaining = computed(() => props.maxLength - content.value.length)
const canSubmit = computed(() =>
  content.value.trim().length > 0
  && content.value.length <= props.maxLength
  && !isSubmitting.value
)

function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'No se pudo guardar el comentario'
}

async function submit() {
  if (!canSubmit.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await props.submitAction(content.value.trim())
    content.value = ''
    emit('submitted')
  } catch (error) {
    errorMessage.value = errorText(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form
    class="space-y-2"
    @submit.prevent="submit"
  >
    <UTextarea
      v-model="content"
      :rows="3"
      :maxlength="maxLength"
      :placeholder="placeholder"
      autoresize
      class="w-full"
      :aria-invalid="Boolean(errorMessage)"
    />

    <div class="flex flex-wrap items-center justify-between gap-2">
      <span
        class="text-xs"
        :class="remaining < 0 ? 'text-red-600' : 'text-gray-500'"
      >
        {{ content.length }} / {{ maxLength }}
      </span>

      <div class="flex items-center gap-2">
        <UButton
          v-if="showCancel"
          type="button"
          color="neutral"
          variant="ghost"
          size="sm"
          label="Cancelar"
          class="cursor-pointer"
          @click="emit('cancel')"
        />
        <UButton
          type="submit"
          size="sm"
          :label="submitLabel"
          :loading="isSubmitting"
          :disabled="!canSubmit"
          class="cursor-pointer"
        />
      </div>
    </div>

    <p
      v-if="errorMessage"
      class="text-sm text-red-600"
      role="alert"
    >
      {{ errorMessage }}
    </p>
  </form>
</template>

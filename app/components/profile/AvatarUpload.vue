<script setup lang="ts">
const props = defineProps<{
  modelValue: File | null
  avatarUrl?: string | null
  removed?: boolean
  disabled?: boolean
  maxSizeMB?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [file: File | null]
  'update:removed': [value: boolean]
  'invalid': [message: string]
}>()

const maxSize = computed(() => (props.maxSizeMB ?? 1) * 1024 * 1024)

const file = computed({
  get: () => props.modelValue,
  set: (value: File | null) => emit('update:modelValue', value)
})

const preview = computed(() => {
  if (file.value) return URL.createObjectURL(file.value)
  if (!props.removed && props.avatarUrl) return props.avatarUrl
  return null
})

function onFileChange() {
  const selected = file.value
  if (!selected) return
  if (selected.size > maxSize.value) {
    emit('update:modelValue', null)
    emit('invalid', `La imagen supera el tamaño máximo de ${props.maxSizeMB ?? 1} MB`)
    return
  }
  emit('update:removed', false)
}

function clear() {
  emit('update:modelValue', null)
  emit('update:removed', true)
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="preview"
      class="relative w-fit"
    >
      <img
        :src="preview"
        alt="Vista previa del avatar"
        class="size-24 rounded-full object-cover border border-slate-200"
      >
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        class="absolute -top-2 -right-2 cursor-pointer rounded-full"
        aria-label="Quitar avatar"
        :disabled="disabled"
        @click="clear"
      />
    </div>
    <UFileUpload
      v-model="file"
      accept="image/*"
      :disabled="disabled"
      label="Subir avatar"
      description="JPG, PNG o WebP"
      @change="onFileChange"
    />
  </div>
</template>

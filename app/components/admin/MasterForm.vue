<script setup lang="ts">
import * as z from 'zod'
import type { Master } from '~/types/master'
import type { PhoneInputExpose } from '~/types/phone'

const supabase = useSupabaseClient()
const toast = useToast()
const { uploadMasterAvatar, deleteMasterAvatarByUrl } = useMasterAvatar()

const props = defineProps<{
  master?: Master | null
}>()

const emit = defineEmits<{
  saved: [master: Master]
}>()

const isOpen = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const currentMaster = ref<Master | null>(null)
const avatarFile = ref<File | null>(null)
const avatarRemoved = ref(false)
const phoneInput = ref<PhoneInputExpose | null>(null)

const isEdit = computed(() => !!currentMaster.value)

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
  avatarFile.value = null
  avatarRemoved.value = false
  errorMessage.value = null
  successMessage.value = null
}

const hydrateState = (master: Master) => {
  state.full_name = master.full_name ?? ''
  state.user_name = master.user_name ?? ''
  state.avatar_url = master.avatar_url ?? ''
  avatarFile.value = null
  avatarRemoved.value = false
  errorMessage.value = null
  successMessage.value = null

  phoneInput.value?.hydrateFromFull(master.phone ?? '')
}

const avatarPreview = computed(() => {
  if (avatarFile.value) return URL.createObjectURL(avatarFile.value)
  if (state.avatar_url) return state.avatar_url
  return null
})

const onAvatarChange = () => {
  if (avatarFile.value && avatarFile.value.size > 1 * 1024 * 1024) {
    toast.add({
      title: 'La imagen supera el tamaño máximo de 1 MB',
      color: 'error',
      icon: 'i-lucide-octagon-x'
    })
    avatarFile.value = null
    return
  }
  if (avatarFile.value) {
    avatarRemoved.value = false
  }
}

const clearAvatar = () => {
  avatarFile.value = null
  state.avatar_url = ''
  avatarRemoved.value = true
}

function open(master?: Master | null) {
  if (master) {
    currentMaster.value = master
    hydrateState(master)
  } else {
    currentMaster.value = null
    resetForm()
  }
  isOpen.value = true
}

async function submitMaster() {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = null
  successMessage.value = null

  const previousAvatarUrl = currentMaster.value?.avatar_url ?? null

  let uploadedUrl: string | null = null
  if (avatarFile.value) {
    try {
      uploadedUrl = await uploadMasterAvatar(avatarFile.value)
    } catch (uploadError) {
      isSubmitting.value = false
      errorMessage.value = uploadError instanceof Error ? uploadError.message : 'No se pudo subir el avatar'
      return
    }
  }

  const payload = {
    full_name: state.full_name?.trim() || null,
    user_name: state.user_name?.trim() || null,
    phone: phoneInput.value?.fullNumber || null,
    avatar_url: avatarFile.value ? uploadedUrl : (avatarRemoved.value ? null : (state.avatar_url?.trim() || null))
  }

  const cleanupUpload = async () => {
    if (uploadedUrl) await deleteMasterAvatarByUrl(uploadedUrl)
  }

  const cleanupPreviousAvatar = async () => {
    const replaced = uploadedUrl ? previousAvatarUrl !== uploadedUrl : avatarRemoved.value
    if (replaced && previousAvatarUrl) {
      await deleteMasterAvatarByUrl(previousAvatarUrl)
    }
  }

  if (isEdit.value && currentMaster.value) {
    const masterId = currentMaster.value.id
    const { error: updateError } = await supabase
      .from('dagger_masters')
      .update(payload)
      .eq('id', masterId)

    if (updateError) {
      await cleanupUpload()
      isSubmitting.value = false
      errorMessage.value = updateError.message
      return
    }

    await cleanupPreviousAvatar()

    const { data: refreshed, error: selectError } = await supabase
      .from('dagger_masters')
      .select('id,full_name,user_name,phone,avatar_url,status')
      .eq('id', masterId)
      .maybeSingle()

    isSubmitting.value = false

    if (selectError) {
      errorMessage.value = selectError.message
      return
    }

    successMessage.value = 'Master actualizado correctamente'
    const savedMaster = (refreshed as Master | null) ?? { ...currentMaster.value, ...payload }
    currentMaster.value = savedMaster
    emit('saved', savedMaster)
    isOpen.value = false
    return
  }

  const { data, error } = await supabase
    .from('dagger_masters')
    .insert(payload)
    .select('id,full_name,user_name,phone,avatar_url,status')
    .single()

  isSubmitting.value = false

  if (error) {
    await cleanupUpload()
    errorMessage.value = error.message
    return
  }

  successMessage.value = 'Master creado correctamente'
  emit('saved', data as Master)
  isOpen.value = false
}

defineExpose({ open })
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEdit ? 'Editar master' : 'Nuevo master'"
  >
    <UButton
      v-if="!props.master"
      label="Nuevo Master"
      icon="i-heroicons-plus"
      class="cursor-pointer"
      @click="open(null)"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="w-full space-y-4"
        @submit="submitMaster"
      >
        <UFormField
          label="Nombre completo"
          name="full_name"
          required
        >
          <UInput
            v-model="state.full_name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Apodo"
          name="user_name"
        >
          <UInput
            v-model="state.user_name"
            class="w-full"
          />
        </UFormField>

        <PhoneInput
          ref="phoneInput"
          v-model="state.phone"
          name="phone"
          label="Teléfono"
        />

        <UFormField
          label="Avatar"
          name="avatar_url"
        >
          <div class="space-y-4">
            <div
              v-if="avatarPreview"
              class="relative w-fit"
            >
              <img
                :src="avatarPreview"
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
                :disabled="isSubmitting"
                @click="clearAvatar"
              />
            </div>
            <UFileUpload
              v-model="avatarFile"
              accept="image/*"
              :disabled="isSubmitting"
              label="Subir avatar"
              description="JPG, PNG o WebP · Máximo 5 MB"
              @change="onAvatarChange"
            />
          </div>
        </UFormField>

        <p
          v-if="errorMessage"
          class="text-sm text-red-600"
        >
          {{ errorMessage }}
        </p>
        <p
          v-if="successMessage"
          class="text-sm text-green-600"
        >
          {{ successMessage }}
        </p>

        <UButton
          type="submit"
          block
          :loading="isSubmitting"
          class="cursor-pointer"
        >
          {{ isEdit ? 'Actualizar Master' : 'Guardar Master' }}
        </UButton>
      </UForm>
    </template>
  </UModal>
</template>

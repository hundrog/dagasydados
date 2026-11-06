<script setup lang="ts">
import * as z from 'zod'
import type { PhoneInputExpose } from '~/types/phone'

const supabase = useSupabaseClient()
const toast = useToast()
const user = useSupabaseUser()
const profileStore = useCurrentProfileStore()
const { uploadMasterAvatar, deleteMasterAvatarByUrl } = useMasterAvatar()

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const avatarFile = ref<File | null>(null)
const avatarRemoved = ref(false)
const phoneInput = ref<PhoneInputExpose | null>(null)

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

watch(
  () => profileStore.master,
  (m) => {
    if (!m) return
    state.full_name = m.full_name ?? ''
    state.user_name = m.user_name ?? ''
    state.phone = m.phone ?? ''
    state.avatar_url = m.avatar_url ?? ''
    avatarFile.value = null
    avatarRemoved.value = false
    phoneInput.value?.hydrateFromFull(m.phone ?? '')
  },
  { immediate: true }
)

async function saveIdentity() {
  if (isSubmitting.value || !user.value?.sub) return

  isSubmitting.value = true
  errorMessage.value = null
  successMessage.value = null

  const previousAvatarUrl = profileStore.master?.avatar_url ?? null

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

  const { error: updateError } = await supabase
    .from('dagger_masters')
    .update(payload)
    .eq('id', user.value.sub)

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
    .eq('id', user.value.sub)
    .maybeSingle()

  isSubmitting.value = false

  if (selectError) {
    errorMessage.value = selectError.message
    return
  }

  if (refreshed) {
    profileStore.refresh()
  }

  successMessage.value = 'Perfil actualizado correctamente'
  toast.add({
    title: 'Perfil actualizado',
    color: 'success',
    icon: 'i-lucide-circle-check'
  })
}

async function requestMaster() {
  if (!user.value?.sub) return

  const { error } = await supabase.rpc('request_master_authorization')

  if (error) {
    toast.add({ title: 'Error', description: error.message, color: 'error' })
    return
  }

  await profileStore.refresh()
  toast.add({ title: 'Solicitud enviada', color: 'success', icon: 'i-lucide-circle-check' })
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-8 p-4">
    <h1 class="text-2xl font-bold text-primary-900">
      Mi cuenta
    </h1>

    <div v-if="profileStore.isLoading">
      Cargando...
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <div class="flex items-center gap-4">
        <UAvatar
          :src="avatarPreview || profileStore.master?.avatar_url || undefined"
          :text="profileStore.master?.full_name?.charAt(0) ?? 'P'"
          size="xl"
        />
        <div>
          <p class="font-semibold text-primary-900">
            {{ profileStore.master?.full_name || 'Sin nombre' }}
          </p>
          <p class="text-sm text-slate-500">
            Estado: {{ profileStore.master?.status }}
          </p>
          <p class="text-sm text-slate-500">
            Rol: {{ profileStore.master?.role }}
          </p>
        </div>
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="saveIdentity"
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
              description="JPG, PNG o WebP · Máximo 1 MB"
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
          Guardar
        </UButton>
      </UForm>

      <div
        v-if="profileStore.canRequestMaster"
        class="pt-4 border-t border-slate-200"
      >
        <p class="text-sm text-slate-600 mb-2">
          Puedes solicitar autorización para ser master.
        </p>
        <UButton
          label="Solicitar ser master"
          icon="i-lucide-shield-check"
          class="cursor-pointer"
          color="secondary"
          block
          @click="requestMaster"
        />
      </div>

      <div
        v-else-if="profileStore.master?.status === 'pending'"
        class="text-sm text-amber-600"
      >
        Tu solicitud para ser master está pendiente de aprobación.
      </div>
    </div>
  </div>
</template>

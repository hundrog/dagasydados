<script setup lang="ts">
import * as z from 'zod'
import { vMaska } from 'maska/vue'
import type { Master } from '~/types/master'

type PhoneCode = {
  name: string
  code: string
  emoji: string
  dialCode: string
  mask: string
}

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
let skipCountryWatch = false

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

const stripCountryCode = (digits: string, dialCode: string) => {
  const d = dialCode.replace(/\D/g, '')
  return d && digits.length > d.length && digits.startsWith(d) ? digits.slice(d.length) : digits
}

const withMobilePrefix = (country: PhoneCode | undefined, digits: string) => {
  return country?.code === 'MX' ? `1${digits}` : digits
}

const hydrateState = (master: Master) => {
  state.full_name = master.full_name ?? ''
  state.user_name = master.user_name ?? ''
  state.avatar_url = master.avatar_url ?? ''
  avatarFile.value = null
  avatarRemoved.value = false
  errorMessage.value = null
  successMessage.value = null

  const digits = master.phone?.replace(/\D/g, '') ?? ''
  const match = (phoneCodes.value ?? []).find((c) => {
    const d = c.dialCode.replace(/\D/g, '')
    return d && digits.length > d.length && digits.startsWith(d)
  })
  const detected = match ?? { code: 'MX', dialCode: '+52' }
  skipCountryWatch = true
  countryCode.value = detected.code
  state.phone = stripCountryCode(digits, detected.dialCode)
  if (detected.code === 'MX' && state.phone.startsWith('1')) {
    state.phone = state.phone.slice(1)
  }
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
    phone: (state.phone?.replace(/\D/g, '') && `${dialCode.value.replace(/\D/g, '')}${withMobilePrefix(country.value, state.phone.replace(/\D/g, ''))}`) || null,
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
      .select('id,full_name,user_name,phone,avatar_url')
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
    .select('id,full_name,user_name,phone,avatar_url')
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

const countryCode = ref('MX')

const { data: phoneCodes, status, execute } = await useLazyFetch<PhoneCode[]>('/api/phone-codes')

const country = computed(() => phoneCodes.value?.find(c => c.code === countryCode.value))
const dialCode = computed(() => country.value?.dialCode || '+52')
const mask = computed(() => country.value?.mask || '(##) #### ####')

function onOpen() {
  if (!phoneCodes.value?.length) {
    execute()
  }
}

watch(countryCode, () => {
  if (skipCountryWatch) {
    skipCountryWatch = false
    return
  }
  state.phone = ''
})
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

        <UFormField
          label="Teléfono"
          name="phone"
        >
          <UFieldGroup class="w-full">
            <USelectMenu
              v-model="countryCode"
              :items="phoneCodes"
              value-key="code"
              :search-input="{
                placeholder: 'Search country...',
                icon: 'i-lucide-search',
                loading: status === 'pending'
              }"
              :filter-fields="['name', 'code', 'dialCode']"
              :content="{ align: 'start' }"
              :ui="{
                base: 'pe-8',
                content: 'w-48',
                placeholder: 'hidden',
                trailingIcon: 'size-4'
              }"
              trailing-icon="i-lucide-chevrons-up-down"
              @update:open="onOpen"
            >
              <span class="size-5 flex items-center text-lg">
                {{ country?.emoji || '\u{1F1FA}\u{1F1F8}' }}
              </span>

              <template #item-leading="{ item }">
                <span class="size-5 flex items-center text-lg">
                  {{ item.emoji }}
                </span>
              </template>

              <template #item-label="{ item }">
                {{ item.name }} ({{ item.dialCode }})
              </template>
            </USelectMenu>

            <UInput
              v-model="state.phone"
              v-maska="mask"
              class="w-full"
              :placeholder="mask.replaceAll('#', '_')"
            >
              <template #leading>
                {{ dialCode }}
              </template>
            </UInput>
          </UFieldGroup>
        </UFormField>

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

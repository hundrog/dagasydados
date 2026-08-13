<script setup lang="ts">
import * as z from 'zod'
import { vMaska } from 'maska/vue'
import type { Master, MasterProfile } from '~/types/master'

type PhoneCode = {
  name: string
  code: string
  emoji: string
  dialCode: string
  mask: string
}

const route = useRoute()
const supabase = useSupabaseClient()
const toast = useToast()
const adminStore = useAdminStore()
const { isAdmin } = storeToRefs(adminStore)
const user = useSupabaseUser()
const { uploadMasterAvatar, deleteMasterAvatarByUrl } = useMasterAvatar()

const masterId = computed(() => String(route.params.id))

const masterName = ref<string | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)
const canEdit = ref(false)
const previousAvatarUrl = ref<string | null>(null)
const avatarFile = ref<File | null>(null)
const avatarRemoved = ref(false)

const schema = z.object({
  full_name: z.string().min(1, 'El nombre es obligatorio'),
  user_name: z.string().optional(),
  phone: z.string().optional(),
  avatar_url: z.url('Debe ser una URL válida').optional().or(z.literal('')),
  plataforma_pago: z.string().optional(),
  plataforma_pago_cuenta: z.string().optional(),
  estilo_juego: z.object({
    narrativo: z.number().int().min(1, 'La prioridad mínima es 1').max(4, 'La prioridad máxima es 4'),
    tactico: z.number().int().min(1, 'La prioridad mínima es 1').max(4, 'La prioridad máxima es 4'),
    roll: z.number().int().min(1, 'La prioridad mínima es 1').max(4, 'La prioridad máxima es 4'),
    puzzle: z.number().int().min(1, 'La prioridad mínima es 1').max(4, 'La prioridad máxima es 4')
  }).superRefine((estilo, ctx) => {
    const values = Object.values(estilo)
    if (new Set(values).size !== values.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['estilo_juego'],
        message: 'Cada estilo debe tener una prioridad distinta (de 1 a 4)'
      })
    }
  }),
  homebrew: z.object({
    mecanicas: z.string().default(''),
    mundo: z.string().default('')
  }),
  referencias: z.object({
    peliculas: z.array(z.string()).default([]),
    libros: z.array(z.string()).default([]),
    videojuegos: z.array(z.string()).default([]),
    series_anime: z.array(z.string()).default([])
  })
})

type Schema = z.infer<typeof schema>

const initialState = (): Schema => ({
  full_name: '',
  user_name: '',
  phone: '',
  avatar_url: '',
  plataforma_pago: '',
  plataforma_pago_cuenta: '',
  estilo_juego: { narrativo: 1, tactico: 2, roll: 3, puzzle: 4 },
  homebrew: { mecanicas: '', mundo: '' },
  referencias: { peliculas: [], libros: [], videojuegos: [], series_anime: [] }
})

const state = reactive<Schema>(initialState())

const estiloKeys = ['narrativo', 'tactico', 'roll', 'puzzle'] as const
type EstiloKey = typeof estiloKeys[number]

const estiloMeta: Record<EstiloKey, { label: string, description: string, icon: string }> = {
  narrativo: { label: 'Narrativo', description: 'Historias, personajes y arcos narrativos', icon: 'i-lucide-book-open' },
  tactico: { label: 'Táctico', description: 'Combate, mapa y decisiones tácticas', icon: 'i-lucide-swords' },
  roll: { label: 'Roll', description: 'Roleo, interpretación e inmersión', icon: 'i-lucide-message-square-quote' },
  puzzle: { label: 'Puzzle', description: 'Acertijos, enigmas y exploración', icon: 'i-lucide-puzzle' }
}

const estiloOrder = ref<EstiloKey[]>([...estiloKeys])

const orderFromEstilo = (estilo: MasterProfile['estilo_juego']): EstiloKey[] =>
  [...estiloKeys].sort((a, b) => (estilo[a] ?? 4) - (estilo[b] ?? 4))

const syncEstiloFromOrder = () => {
  estiloOrder.value.forEach((key, index) => {
    state.estilo_juego[key] = index + 1
  })
}

const draggingIndex = ref<number | null>(null)

const onDragStart = (event: DragEvent, index: number) => {
  if (isSubmitting.value) return
  draggingIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

const onDragEnd = () => {
  draggingIndex.value = null
}

const onDrop = (index: number) => {
  const from = draggingIndex.value
  if (from === null || from === index) return
  const [moved] = estiloOrder.value.splice(from, 1)
  if (!moved) {
    draggingIndex.value = null
    return
  }
  estiloOrder.value.splice(index, 0, moved)
  syncEstiloFromOrder()
  draggingIndex.value = null
}

const moveEstilo = (key: EstiloKey, direction: -1 | 1) => {
  const index = estiloOrder.value.indexOf(key)
  const target = index + direction
  if (index === -1 || target < 0 || target >= estiloOrder.value.length) return
  estiloOrder.value.splice(index, 1)
  estiloOrder.value.splice(target, 0, key)
  syncEstiloFromOrder()
}

const cleanList = (items: string[]) =>
  [...new Set(items.map(item => item.trim()).filter(Boolean))]

const buildProfile = (): MasterProfile => ({
  estilo_juego: { ...state.estilo_juego },
  homebrew: {
    mecanicas: state.homebrew.mecanicas.trim() || '',
    mundo: state.homebrew.mundo.trim() || ''
  },
  referencias: {
    peliculas: cleanList(state.referencias.peliculas),
    libros: cleanList(state.referencias.libros),
    videojuegos: cleanList(state.referencias.videojuegos),
    series_anime: cleanList(state.referencias.series_anime)
  }
})

const avatarPreview = computed(() => {
  if (avatarFile.value) return URL.createObjectURL(avatarFile.value)
  if (state.avatar_url) return state.avatar_url
  return null
})

const onAvatarChange = () => {
  if (avatarFile.value && avatarFile.value.size > 5 * 1024 * 1024) {
    toast.add({
      title: 'La imagen supera el tamaño máximo de 5 MB',
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

const stripCountryCode = (digits: string, dialCode: string) => {
  const d = dialCode.replace(/\D/g, '')
  return d && digits.length > d.length && digits.startsWith(d) ? digits.slice(d.length) : digits
}

const withMobilePrefix = (country: PhoneCode | undefined, digits: string) => {
  return country?.code === 'MX' ? `1${digits}` : digits
}

const applyProfile = (profile: MasterProfile) => {
  state.estilo_juego = { ...profile.estilo_juego }
  state.homebrew = {
    mecanicas: profile.homebrew?.mecanicas ?? '',
    mundo: profile.homebrew?.mundo ?? ''
  }
  state.referencias = {
    peliculas: profile.referencias?.peliculas ?? [],
    libros: profile.referencias?.libros ?? [],
    videojuegos: profile.referencias?.videojuegos ?? [],
    series_anime: profile.referencias?.series_anime ?? []
  }
  estiloOrder.value = orderFromEstilo(state.estilo_juego)
}

const hydrateMaster = (master: Master) => {
  state.full_name = master.full_name ?? ''
  state.user_name = master.user_name ?? ''
  state.avatar_url = master.avatar_url ?? ''
  state.plataforma_pago = master.plataforma_pago ?? ''
  state.plataforma_pago_cuenta = master.plataforma_pago_cuenta ?? ''
  avatarFile.value = null
  avatarRemoved.value = false

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

onMounted(async () => {
  await adminStore.refresh()

  const { data, error } = await supabase
    .from('dagger_masters')
    .select('id,full_name,user_name,phone,avatar_url,plataforma_pago,plataforma_pago_cuenta,profile')
    .eq('id', masterId.value)
    .maybeSingle()

  isLoading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  if (!data) {
    errorMessage.value = 'No se encontró el master'
    return
  }

  masterName.value = data.full_name || data.user_name || 'Master'
  canEdit.value = isAdmin.value || data.id === user.value?.sub

  if (!canEdit.value) {
    errorMessage.value = 'No tienes permisos para editar este perfil'
    return
  }

  previousAvatarUrl.value = data.avatar_url
  hydrateMaster(data as Master)
  applyProfile((data.profile as MasterProfile | null) ?? initialState())
})

async function submitProfile() {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = null

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

  const phone = (state.phone?.replace(/\D/g, '') && `${dialCode.value.replace(/\D/g, '')}${withMobilePrefix(country.value, state.phone.replace(/\D/g, ''))}`) || null

  const payload = {
    full_name: state.full_name.trim() || null,
    user_name: state.user_name?.trim() || null,
    phone,
    avatar_url: avatarFile.value ? uploadedUrl : (avatarRemoved.value ? null : (state.avatar_url?.trim() || null)),
    plataforma_pago: state.plataforma_pago?.trim() || null,
    plataforma_pago_cuenta: state.plataforma_pago_cuenta?.trim() || null,
    profile: buildProfile()
  }

  const { error } = await supabase
    .from('dagger_masters')
    .update(payload)
    .eq('id', masterId.value)

  if (error) {
    if (uploadedUrl) await deleteMasterAvatarByUrl(uploadedUrl)
    isSubmitting.value = false
    errorMessage.value = error.message
    return
  }

  const replaced = uploadedUrl ? previousAvatarUrl.value !== uploadedUrl : avatarRemoved.value
  if (replaced && previousAvatarUrl.value) {
    await deleteMasterAvatarByUrl(previousAvatarUrl.value)
  }

  isSubmitting.value = false

  toast.add({
    title: 'Perfil actualizado',
    color: 'success',
    icon: 'i-lucide-circle-check'
  })

  navigateTo('/admin/masters')
}

const goBack = () => {
  navigateTo('/admin/masters')
}

const countryCode = ref('MX')
let skipCountryWatch = false

const { data: phoneCodes, status, execute } = await useLazyFetch<PhoneCode[]>('/api/phone-codes')

const country = computed(() => phoneCodes.value?.find(c => c.code === countryCode.value))
const dialCode = computed(() => country.value?.dialCode || '+52')
const mask = computed(() => country.value?.mask || '(##) #### ####')

watch(countryCode, () => {
  if (skipCountryWatch) {
    skipCountryWatch = false
    return
  }
  state.phone = ''
})
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-primary-600">
            {{ masterId === user?.sub ? 'Edita tu Perfil' : `Editar perfil de ${masterName || 'Master'}` }}
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Actualiza tus datos y define tu perfil como master.
          </p>
        </div>
        <UButton
          label="Volver"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          class="cursor-pointer"
          @click="goBack"
        />
      </div>

      <div
        v-if="isLoading"
        class="p-4 text-sm text-slate-500"
      >
        Cargando perfil...
      </div>
      <div
        v-else-if="errorMessage"
        class="p-4 text-sm text-red-600"
      >
        {{ errorMessage }}
      </div>

      <UForm
        v-else
        :schema="schema"
        :state="state"
        class="w-full space-y-8"
        @submit="submitProfile"
      >
        <section
          id="informacion-master"
          class="space-y-4 scroll-mt-24"
        >
          <h2 class="text-lg font-semibold text-primary-900">
            Información del master
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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
              class="md:col-span-2"
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
                  @update:open="execute()"
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
              class="md:col-span-2"
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
            <UFormField
              label="Plataforma de pago"
              name="plataforma_pago"
              description="Nombre de la plataforma donde recibes el pago (BBVA, PayPal, Ko-fi, etc.)."
            >
              <UInput
                v-model="state.plataforma_pago"
                class="w-full"
                placeholder="Ej. BBVA, PayPal, Ko-fi..."
                leading-icon="i-lucide-credit-card"
              />
            </UFormField>
            <UFormField
              label="Link o cuenta de pago"
              name="plataforma_pago_cuenta"
              description="Link o cuenta donde quieres recibir el pago por tus sesiones."
            >
              <UInput
                v-model="state.plataforma_pago_cuenta"
                class="w-full"
                placeholder="Ej. tu.usuario@paypal.me, CLABE, link de MercadoPago..."
              />
            </UFormField>
          </div>
        </section>

        <section
          id="estilo-juego"
          class="space-y-4 scroll-mt-24"
        >
          <h2 class="text-lg font-semibold text-primary-900">
            Estilo de juego
          </h2>
          <UFormField
            name="estilo_juego"
            description="Arrastra cada estilo para ordenarlos. La posición 1 es la prioridad más alta."
          >
            <ul
              class="space-y-3"
              role="list"
            >
              <li
                v-for="(key, index) in estiloOrder"
                :key="key"
                role="listitem"
                class="cursor-grab active:cursor-grabbing flex items-center gap-4 rounded-lg border px-4 py-3 transition"
                :class="draggingIndex === index ? 'border-primary-500 shadow-md' : 'border-slate-200'"
                :draggable="!isSubmitting"
                :aria-label="`${estiloMeta[key].label}, prioridad ${index + 1}`"
                @dragstart="onDragStart($event, index)"
                @dragover.prevent
                @drop="onDrop(index)"
                @dragend="onDragEnd"
              >
                <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-sm font-bold text-primary-600">
                  {{ index + 1 }}
                </span>
                <UIcon
                  :name="estiloMeta[key].icon"
                  class="size-5 shrink-0 text-primary-500"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-primary-600">
                    {{ estiloMeta[key].label }}
                  </p>
                  <p class="text-sm text-slate-500">
                    {{ estiloMeta[key].description }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-1">
                  <UButton
                    icon="i-lucide-chevron-up"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :aria-label="`Mover ${estiloMeta[key].label} hacia arriba`"
                    :disabled="isSubmitting || index === 0"
                    class="cursor-pointer"
                    @click="moveEstilo(key, -1)"
                  />
                  <UButton
                    icon="i-lucide-chevron-down"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :aria-label="`Mover ${estiloMeta[key].label} hacia abajo`"
                    :disabled="isSubmitting || index === estiloOrder.length - 1"
                    class="cursor-pointer"
                    @click="moveEstilo(key, 1)"
                  />
                </div>
                <UIcon
                  name="i-lucide-grip-vertical"
                  class="shrink-0 text-slate-300"
                />
              </li>
            </ul>
          </UFormField>
        </section>

        <section
          id="homebrew"
          class="space-y-4 scroll-mt-24"
        >
          <h2 class="text-lg font-semibold text-primary-900">
            Homebrew
          </h2>
          <div class="grid grid-cols-1 gap-4">
            <UFormField
              label="Mecánicas"
              name="homebrew.mecanicas"
              description="Casas, sistemas o reglas propias que te gusta usar."
            >
              <UTextarea
                v-model="state.homebrew.mecanicas"
                class="w-full"
                :rows="3"
                placeholder="Ej. Combate ágil, magia basada en dados, progresión narrativa..."
              />
            </UFormField>
            <UFormField
              label="Mundo"
              name="homebrew.mundo"
              description="Mundos, escenarios o campañas originales que diriges."
            >
              <UTextarea
                v-model="state.homebrew.mundo"
                class="w-full"
                :rows="3"
                placeholder="Ej. Un reino steampunk, una ciudad flotante, una región postapocalíptica..."
              />
            </UFormField>
          </div>
        </section>

        <section
          id="referencias"
          class="space-y-4 scroll-mt-24"
        >
          <h2 class="text-lg font-semibold text-primary-900">
            Referencias
          </h2>
          <div class="grid grid-cols-1 gap-4">
            <UFormField
              label="Películas"
              name="referencias.peliculas"
            >
              <UInputTags
                v-model="state.referencias.peliculas"
                class="w-full"
                placeholder="Escribe una película y presiona Enter"
                :leading-icon="'i-lucide-film'"
              />
            </UFormField>
            <UFormField
              label="Libros"
              name="referencias.libros"
            >
              <UInputTags
                v-model="state.referencias.libros"
                class="w-full"
                placeholder="Escribe un libro y presiona Enter"
                :leading-icon="'i-lucide-library'"
              />
            </UFormField>
            <UFormField
              label="Videojuegos"
              name="referencias.videojuegos"
            >
              <UInputTags
                v-model="state.referencias.videojuegos"
                class="w-full"
                placeholder="Escribe un videojuego y presiona Enter"
                :leading-icon="'i-lucide-gamepad-2'"
              />
            </UFormField>
            <UFormField
              label="Series y anime"
              name="referencias.series_anime"
            >
              <UInputTags
                v-model="state.referencias.series_anime"
                class="w-full"
                placeholder="Escribe una serie o anime y presiona Enter"
                :leading-icon="'i-lucide-tv'"
              />
            </UFormField>
          </div>
        </section>

        <p
          v-if="errorMessage"
          class="text-sm text-red-600"
        >
          {{ errorMessage }}
        </p>

        <div class="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="ghost"
            class="cursor-pointer"
            :disabled="isSubmitting"
            @click="goBack"
          />
          <UButton
            type="submit"
            label="Guardar perfil"
            class="cursor-pointer"
            :loading="isSubmitting"
          />
        </div>
      </UForm>
    </div>
  </div>
</template>

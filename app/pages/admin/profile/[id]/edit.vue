<script setup lang="ts">
import * as z from 'zod'
import type { MasterProfile } from '~/types/master'

const route = useRoute()
const supabase = useSupabaseClient()
const toast = useToast()
const { isAdmin, refresh: refreshAdminStatus } = useIsAdmin()
const user = useSupabaseUser()

const masterId = computed(() => String(route.params.id))

const masterName = ref<string | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)
const canEdit = ref(false)

const schema = z.object({
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

onMounted(async () => {
  await refreshAdminStatus()

  const { data, error } = await supabase
    .from('dagger_masters')
    .select('id,full_name,user_name,profile')
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

  applyProfile((data.profile as MasterProfile | null) ?? initialState())
})

async function submitProfile() {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = null

  const { error } = await supabase
    .from('dagger_masters')
    .update({ profile: buildProfile() })
    .eq('id', masterId.value)

  isSubmitting.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

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
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-primary-600">
            Editar perfil de {{ masterName || 'Master' }}
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Define tu estilo de juego, tu homebrew y tus referencias.
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

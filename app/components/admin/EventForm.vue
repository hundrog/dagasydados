<script setup lang="ts">
import * as z from 'zod'
import type { Event } from '~/types/event'
import { useEventImage } from '~/composables/useEventImage'
import { parseLocalDate } from '~/utils/date'

const supabase = useSupabaseClient()
const toast = useToast()
const { uploadEventImage, deleteEventImageByUrl } = useEventImage()

const props = defineProps<{
  event?: Event | null
}>()

const emit = defineEmits<{
  saved: [Event]
  cancel: []
}>()

const schema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  image_url: z.string().optional(),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
  hora_inicio: z.string().optional(),
  fecha_fin: z.string().min(1, 'La fecha de fin es obligatoria'),
  hora_fin: z.string().optional(),
  zona_horaria: z.string().optional(),
  featured: z.boolean()
})

type Schema = z.infer<typeof schema>

const initialState = (): Schema => ({
  name: props.event?.name ?? '',
  description: props.event?.description ?? '',
  image_url: props.event?.image_url ?? '',
  fecha_inicio: props.event?.fecha_inicio ?? '',
  hora_inicio: props.event?.hora_inicio ?? '',
  fecha_fin: props.event?.fecha_fin ?? '',
  hora_fin: props.event?.hora_fin ?? '',
  zona_horaria: props.event?.zona_horaria ?? '',
  featured: props.event?.featured ?? false
})

const state = reactive<Schema>(initialState())

const imageFile = ref<File | null>(null)

const imagePreview = computed(() => {
  if (imageFile.value) return URL.createObjectURL(imageFile.value)
  return state.image_url || null
})

const onImageChange = () => {
  if (!imageFile.value) {
    state.image_url = props.event?.image_url ?? ''
    return
  }
  if (imageFile.value.size > 2 * 1024 * 1024) {
    toast.add({
      title: 'La imagen supera el tamaño máximo de 2 MB',
      color: 'error',
      icon: 'i-lucide-octagon-x'
    })
    imageFile.value = null
  }
}

const clearImage = () => {
  imageFile.value = null
  state.image_url = props.event?.image_url ?? ''
}

const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const combineLocal = (date: string, time: string | null | undefined): Date | null => {
  const parsed = parseLocalDate(date)
  if (!parsed) return null
  if (time) {
    const [hoursStr, minutesStr] = time.split(':')
    const hours = Number(hoursStr)
    if (!Number.isNaN(hours)) {
      parsed.setHours(hours, Number.isNaN(Number(minutesStr)) ? 0 : Number(minutesStr), 0, 0)
    }
  }
  return parsed
}

async function submitEvent() {
  if (isSubmitting.value) return

  errorMessage.value = null

  if (!state.fecha_inicio || !state.fecha_fin) {
    errorMessage.value = 'Las fechas de inicio y fin son obligatorias'
    return
  }

  const start = combineLocal(state.fecha_inicio, state.hora_inicio)
  const end = combineLocal(state.fecha_fin, state.hora_fin)

  if (!start || !end || end.getTime() <= start.getTime()) {
    errorMessage.value = 'La fecha de fin debe ser posterior a la fecha de inicio'
    return
  }

  isSubmitting.value = true

  let uploadedUrl: string | null = null

  try {
    if (imageFile.value) {
      uploadedUrl = await uploadEventImage(imageFile.value)
    }
  } catch (uploadError) {
    isSubmitting.value = false
    errorMessage.value = uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen'
    return
  }

  const payload = {
    name: state.name.trim(),
    description: state.description?.trim() || null,
    image_url: (uploadedUrl ?? state.image_url)?.trim() || null,
    fecha_inicio: state.fecha_inicio,
    hora_inicio: state.hora_inicio?.trim() || null,
    fecha_fin: state.fecha_fin,
    hora_fin: state.hora_fin?.trim() || null,
    zona_horaria: state.zona_horaria?.trim() || null,
    featured: state.featured
  }

  if (props.event?.id) {
    const eventId = props.event.id
    const previousImageUrl = props.event.image_url

    const { error: updateError } = await supabase
      .from('events')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', eventId)
      .select()
      .single()

    if (updateError) {
      if (uploadedUrl) await deleteEventImageByUrl(uploadedUrl)
      isSubmitting.value = false
      errorMessage.value = updateError.message
      return
    }

    if (uploadedUrl && previousImageUrl !== uploadedUrl) {
      await deleteEventImageByUrl(previousImageUrl)
    }

    const { data: refreshed, error: selectError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle()

    isSubmitting.value = false

    if (selectError || !refreshed) {
      errorMessage.value = selectError?.message ?? 'No se pudo recargar el evento'
      return
    }

    toast.add({
      title: 'Evento actualizado',
      color: 'success'
    })

    emit('saved', refreshed as Event)
    return
  }

  const { data: inserted, error: insertError } = await supabase
    .from('events')
    .insert(payload)
    .select()
    .single()

  isSubmitting.value = false

  if (insertError) {
    if (uploadedUrl) await deleteEventImageByUrl(uploadedUrl)
    errorMessage.value = insertError.message
    return
  }

  toast.add({
    title: 'Evento creado',
    color: 'success'
  })

  emit('saved', inserted as Event)
}
</script>

<template>
  <div>
    <div
      v-if="errorMessage"
      class="mb-6"
    >
      <UAlert
        color="error"
        variant="subtle"
        title="Error"
        :description="errorMessage"
        icon="i-lucide-octagon-x"
      />
    </div>

    <UForm
      :schema="schema"
      :state="state"
      class="w-full space-y-8"
      @submit="submitEvent"
    >
      <section
        id="informacion-event"
        class="space-y-4 scroll-mt-24"
      >
        <h2 class="text-lg font-semibold text-primary-900">
          Información del evento
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField
            label="Nombre"
            name="name"
            required
          >
            <UInput
              v-model="state.name"
              class="w-full"
              placeholder="Ej. Convento de Rol 2026"
            />
          </UFormField>

          <UFormField
            label="Imagen del evento"
            name="image_url"
          >
            <div class="space-y-4">
              <div
                v-if="imagePreview"
                class="relative w-full max-w-sm"
              >
                <img
                  :src="imagePreview"
                  alt="Vista previa del evento"
                  class="w-full h-40 object-cover rounded-lg border border-slate-200"
                >
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  class="absolute top-2 right-2 cursor-pointer"
                  aria-label="Quitar imagen"
                  :disabled="isSubmitting"
                  @click="clearImage"
                />
              </div>
              <UFileUpload
                v-model="imageFile"
                accept="image/*"
                :disabled="isSubmitting"
                label="Subir imagen"
                description="JPG, PNG o WebP · Máximo 2 MB"
                @change="onImageChange"
              />
            </div>
          </UFormField>

          <UFormField
            label="Fecha de inicio"
            name="fecha_inicio"
            required
          >
            <UInput
              v-model="state.fecha_inicio"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Hora de inicio"
            name="hora_inicio"
          >
            <UInput
              v-model="state.hora_inicio"
              type="time"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Fecha de fin"
            name="fecha_fin"
            required
          >
            <UInput
              v-model="state.fecha_fin"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Hora de fin"
            name="hora_fin"
          >
            <UInput
              v-model="state.hora_fin"
              type="time"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Zona horaria"
            name="zona_horaria"
          >
            <UInput
              v-model="state.zona_horaria"
              class="w-full"
              placeholder="UTC, America/Mexico_City..."
            />
          </UFormField>

          <UFormField
            label="Descripción"
            name="description"
            class="md:col-span-2"
          >
            <UTextarea
              v-model="state.description"
              class="w-full"
              :rows="4"
              placeholder="Describe el evento, su temática, actividades..."
            />
          </UFormField>

          <UFormField
            class="md:col-span-2"
          >
            <div class="rounded-lg border border-slate-200 p-4">
              <USwitch
                v-model="state.featured"
                label="Destacado"
                description="Muestra este evento de forma destacada en la portada."
              />
            </div>
          </UFormField>
        </div>
      </section>

      <div class="flex justify-end gap-2 pt-4 border-t border-slate-200">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          class="cursor-pointer"
          :disabled="isSubmitting"
          @click="emit('cancel')"
        />
        <UButton
          type="submit"
          label="Guardar evento"
          icon="i-lucide-check"
          color="primary"
          class="cursor-pointer"
          :loading="isSubmitting"
        />
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import type { Event } from '~/types/event'
import EventForm from '~/components/admin/EventForm.vue'

const route = useRoute()
const supabase = useSupabaseClient()
const adminStore = useAdminStore()
const { isAdmin } = storeToRefs(adminStore)

if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: 'Acceso denegado' })
}

const eventId = computed(() => String(route.params.id))
const event = ref<Event | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const loadEvent = async (id: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    errorMessage.value = error.message
    return
  }

  if (!data) {
    errorMessage.value = 'No se encontró el evento'
    return
  }

  event.value = data as Event
}

onMounted(async () => {
  await adminStore.refresh()
  await loadEvent(eventId.value)
  isLoading.value = false
})

const onSaved = () => {
  navigateTo('/admin/events')
}

const goBack = () => {
  navigateTo('/admin/events')
}
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="max-w-3xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-primary-600">
            Editar evento
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Modifica los datos del evento.
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
        Cargando evento...
      </div>
      <div
        v-else-if="errorMessage"
        class="p-4 text-sm text-red-600"
      >
        {{ errorMessage }}
      </div>
      <EventForm
        v-else
        :event="event"
        @saved="onSaved"
        @cancel="goBack"
      />
    </div>
  </div>
</template>

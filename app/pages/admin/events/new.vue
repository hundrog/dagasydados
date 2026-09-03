<script setup lang="ts">
import EventForm from '~/components/admin/EventForm.vue'

const goBack = () => {
  navigateTo('/admin/events')
}

const onSaved = () => {
  navigateTo('/admin/events')
}
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="max-w-3xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-primary-900">
            Nuevo evento
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Crea un evento para agrupar varias mesas.
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

      <EventForm
        @saved="onSaved"
        @cancel="goBack"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import SessionForm from '~/components/admin/SessionForm.vue'

const goBack = () => {
  navigateTo('/sessions')
}

const onSaved = () => {
  navigateTo('/sessions')
}
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Nueva sesión</h1>
          <p class="text-sm text-slate-500 mt-1">Crea una nueva sesión de juego.</p>
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

      <SessionForm @saved="onSaved" @cancel="goBack" />
    </div>
  </div>
</template>
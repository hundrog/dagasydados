<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Guía rápida de Markdown"
    description="Sintaxis que puedes usar al escribir el contenido del post."
  >
    <template #body>
      <div class="space-y-6 text-sm">
        <section class="space-y-2">
          <h3 class="font-semibold text-primary-900">
            Títulos
          </h3>
          <div class="space-y-1">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center py-1.5 border-b border-default">
              <code class="text-primary-600"># Título principal</code>
              <span class="text-xl font-bold">Título principal</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center py-1.5 border-b border-default">
              <code class="text-primary-600">## Subtítulo</code>
              <span class="text-lg font-bold">Subtítulo</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center py-1.5 border-b border-default">
              <code class="text-primary-600">### Sección</code>
              <span class="text-base font-semibold">Sección</span>
            </div>
          </div>
        </section>

        <section class="space-y-2">
          <h3 class="font-semibold text-primary-900">
            Énfasis
          </h3>
          <div class="space-y-1">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center py-1.5 border-b border-default">
              <code class="text-primary-600">**texto en negrita**</code>
              <span><strong>texto en negrita</strong></span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center py-1.5 border-b border-default">
              <code class="text-primary-600">*texto en cursiva*</code>
              <span><em>texto en cursiva</em></span>
            </div>
          </div>
        </section>

        <section class="space-y-2">
          <h3 class="font-semibold text-primary-900">
            Listas
          </h3>
          <div class="space-y-1">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center py-1.5 border-b border-default">
              <code class="text-primary-600">* Elemento de lista</code>
              <span>• Elemento de lista</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center py-1.5 border-b border-default">
              <code class="text-primary-600">1. Elemento numerado</code>
              <span>1. Elemento numerado</span>
            </div>
          </div>
        </section>

        <section class="space-y-2">
          <h3 class="font-semibold text-primary-900">
            Enlaces e imágenes
          </h3>
          <div class="space-y-1">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center py-1.5 border-b border-default">
              <code class="text-primary-600">[texto del enlace](https://ejemplo.com)</code>
              <span><a
                href="#"
                class="text-primary-600 underline underline-offset-2"
              >texto del enlace</a></span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center py-1.5 border-b border-default">
              <code class="text-primary-600">![descripción](https://ejemplo.com/imagen.png)</code>
              <span class="text-slate-500">imagen con texto alternativo</span>
            </div>
          </div>
        </section>

        <section class="space-y-2">
          <h3 class="font-semibold text-primary-900">
            Saltos de línea
          </h3>
          <p class="text-slate-500">
            Los saltos de línea simples se respetan al renderizar el contenido.
          </p>
        </section>

        <p class="text-xs text-slate-500">
          Nota: actualmente no se renderizan bloques de código, citas ni tablas.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end">
        <UButton
          label="Cerrar"
          color="neutral"
          @click="open = false"
        />
      </div>
    </template>
  </UModal>
</template>

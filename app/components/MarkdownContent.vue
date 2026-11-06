<script setup lang="ts">
import { renderMarkdown } from '~/utils/markdown'

const props = defineProps<{
  content: string
}>()

const html = computed(() => renderMarkdown(props.content))
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- markdown-it se configura con html: false -->
  <div
    class="prose prose-lg max-w-none"
    v-html="html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

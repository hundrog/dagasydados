<script setup lang="ts">
import type { BlogPost } from '~/types/blog'
import BlogPostForm from '~/components/admin/BlogPostForm.vue'

const client = useSupabaseClient()
const route = useRoute()

// Protección de ruta: solo usuarios autenticados pueden crear posts
const { data: { user } } = await client.auth.getUser()
if (!user) {
  await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
}

const goBack = () => navigateTo('/blog')

const onSaved = (post: BlogPost) => {
  navigateTo(`/blog/${post.slug}`)
}
</script>

<template>
  <div class="w-full px-4 py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-primary-900">
          Nuevo Post
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Crea una nueva entrada para el blog de la comunidad.
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

    <BlogPostForm
      @saved="onSaved"
      @cancel="goBack"
    />
  </div>
</template>

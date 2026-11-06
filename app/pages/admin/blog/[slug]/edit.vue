<script setup lang="ts">
import type { BlogPost, BlogPostWithTags, BlogTag } from '~/types/blog'
import BlogPostForm from '~/components/admin/BlogPostForm.vue'

const route = useRoute()
const client = useSupabaseClient()

// Protección de ruta: solo usuarios autenticados pueden editar posts
const { data: { user } } = await client.auth.getUser()
if (!user) {
  await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
}

const slug = String(route.params.slug)
const post = ref<BlogPostWithTags | null>(null)

const { data, error } = await client
  .from('blog_posts')
  .select('*, blog_posts_tags(blog_tags(name, id))')
  .eq('slug', slug)
  .single()

if (error || !data) {
  throw createError({ statusCode: 404, statusMessage: 'Post no encontrado' })
}

const { blog_posts_tags: _blogPostsTags, ...postData } = data

post.value = {
  ...postData,
  tags: (data.blog_posts_tags ?? [])
    .map(t => t.blog_tags)
    .filter((tag): tag is BlogTag => tag !== null)
}

const goBack = () => navigateTo(`/blog/${slug}`)

const onSaved = (saved: BlogPost) => {
  navigateTo(`/blog/${saved.slug}`)
}
</script>

<template>
  <div class="w-full px-4 py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-primary-900">
          Editar Post
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Modifica los datos de la entrada.
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
      :post="post"
      @saved="onSaved"
      @cancel="goBack"
    />
  </div>
</template>

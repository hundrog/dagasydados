<script setup lang="ts">
import type { BlogPostDetail, BlogTag } from '~/types/blog'

const route = useRoute()
const client = useSupabaseClient()

const slug = route.params.slug as string

async function fetchPost() {
  const { data, error } = await client
    .from('blog_posts')
    .select('*, blog_posts_tags(blog_tags(name, id))')
    .eq('slug', slug)
    .single()

  if (error) throw error

  // El autor es información accesoria: si la RPC falla o no está disponible,
  // el post se sigue mostrando (sin byline) en lugar de devolver un 500.
  const { data: authors, error: authorsError } = await client.rpc('blog_post_authors', {
    p_author_ids: [data.author_id]
  })

  if (authorsError) {
    console.warn('[blog] no se pudo resolver el autor del post', authorsError.message)
  }

  return {
    ...data,
    tags: (data.blog_posts_tags || [])
      .map(t => t.blog_tags)
      .filter((tag): tag is BlogTag => tag !== null),
    author: authors?.[0] ?? null
  } as BlogPostDetail
}

// SSR + lectura individual del post
const { data: postData, error: postError, pending } = await useAsyncData(
  'blog-post',
  async () => fetchPost()
)

if (postError.value || !postData.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post no encontrado' })
}

const post = computed(() => postData.value as BlogPostDetail)

const authorName = computed(() =>
  post.value?.author?.user_name
  || post.value?.author?.full_name
  || 'Anónimo'
)

const adminStore = useAdminStore()
const { isAdmin } = storeToRefs(adminStore)
await adminStore.refresh()
const canEdit = computed(() => isAdmin.value)
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-12">
    <div
      v-if="post"
      class="animate-fade-in"
    >
      <nav class="flex items-center justify-between gap-2 text-sm text-gray-500 mb-8">
        <div class="flex items-center gap-2 min-w-0">
          <NuxtLink
            to="/blog"
            class="hover:text-primary-500 transition-colors"
          >Blog</NuxtLink>
          <UIcon
            name="i-lucide-chevron-right"
            class="w-4 h-4 shrink-0"
          />
          <span class="truncate">{{ post.title }}</span>
        </div>
        <UButton
          v-if="canEdit"
          label="Editar"
          icon="i-lucide-pencil"
          color="neutral"
          variant="ghost"
          class="cursor-pointer shrink-0"
          :to="`/admin/blog/${post.slug}/edit`"
        />
      </nav>

      <header class="mb-8">
        <div class="flex gap-2 mb-4">
          <UBadge
            v-for="tag in post.tags"
            :key="tag.id"
            variant="soft"
            color="secondary"
            size="sm"
          >
            {{ tag.name }}
          </UBadge>
        </div>
        <h1 class="text-4xl font-extrabold mb-4 leading-tight text-primary-600">
          {{ post.title }}
        </h1>
        <div class="flex items-center justify-between gap-4 text-sm text-gray-500 mb-6">
          <span>
            Por {{ authorName }}
          </span>
          <span class="flex items-center gap-1">
            <UIcon
              name="i-lucide-calendar"
              class="w-4 h-4"
            />
            {{ new Date(post.created_at).toLocaleDateString() }}
          </span>
        </div>
      </header>

      <div
        v-if="post.thumbnail"
        class="mb-8"
      >
        <img
          :src="post.thumbnail"
          class="w-full rounded-xl shadow-lg aspect-video object-cover"
          alt="Cover"
        >
      </div>

      <MarkdownContent :content="post.content" />
    </div>

    <div
      v-else-if="pending"
      class="flex justify-center py-20"
    >
      <LoadingIcon />
    </div>
  </div>
</template>

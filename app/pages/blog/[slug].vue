<script setup lang="ts">
import type { BlogPost, BlogTag } from '~/types/blog'

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

  return {
    ...data,
    tags: (data.blog_posts_tags || [])
      .map(t => t.blog_tags)
      .filter((tag): tag is BlogTag => tag !== null)
  } as BlogPost & { tags: BlogTag[] }
}

// SSR + lectura individual del post
const { data: postData, error: postError, pending } = await useAsyncData(
  'blog-post',
  async () => fetchPost()
)

if (postError.value || !postData.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post no encontrado' })
}

const post = computed(() => postData.value as BlogPost & { tags: BlogTag[] })

const user = useSupabaseUser()
const { isAdmin } = storeToRefs(useAdminStore())
const canEdit = computed(() => isAdmin.value || post.value?.author_id === user.value?.sub)

function renderMarkdown(content: string) {
  return content
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold my-4">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold my-4">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold my-4">$1</h3>')
    .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/^\d\. (.*$)/gim, '<ol><li>$1</li></ol>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1" class="rounded-lg my-4 max-w-full h-auto" />')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" class="text-primary-500">$1</a>')
    .replace(/\n/g, '<br/>')
}
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
            color="primary"
            size="xs"
          >
            {{ tag.name }}
          </UBadge>
        </div>
        <h1 class="text-4xl font-extrabold mb-4 leading-tight">
          {{ post.title }}
        </h1>
        <div class="flex items-center gap-4 text-sm text-gray-500 mb-6">
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

      <article class="prose prose-lg dark:prose-invert max-w-none">
        <div v-html="renderMarkdown(post.content)" />
      </article>
    </div>

    <div
      v-else-if="pending"
      class="flex justify-center py-20"
    >
      <LoadingIcon />
    </div>
  </div>
</template>

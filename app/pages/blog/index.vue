<script setup lang="ts">
import type { BlogPost, BlogTag } from '~/types/blog'

const client = useSupabaseClient()

const search = ref('')
const selectedTag = ref<string | null>(null)

const { data: postsData, pending } = await useAsyncData<{ post: BlogPost, tags: BlogTag[] }[]>(
  'blog-posts',
  async () => {
    const { data, error } = await client
      .from('blog_posts')
      .select('*, blog_posts_tags(blog_tags(name, id))')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((p: any) => {
      const postTags = (p.blog_posts_tags || []).map((t: any) => t.blog_tags)
      const { blog_posts_tags, ...post } = p
      return { post: post as BlogPost, tags: postTags as BlogTag[] }
    })
  }
)

const posts = computed(() => postsData.value || [])

const filteredPosts = computed(() => {
  return posts.value.filter(({ post, tags }) => {
    const matchesSearch = !search.value
      || post.title.toLowerCase().includes(search.value.toLowerCase())
      || (post.excerpt && post.excerpt.toLowerCase().includes(search.value.toLowerCase()))

    const matchesTag = !selectedTag.value
      || tags.some(t => t.name === selectedTag.value)

    return matchesSearch && matchesTag
  })
})

// Get all unique tags for the filter
const allTags = computed(() => {
  const uniqueTags = new Set<string>()
  posts.value.forEach(({ tags }) => {
    tags.forEach(t => uniqueTags.add(t.name))
  })
  return Array.from(uniqueTags)
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12">
    <header class="mb-12 text-center">
      <h1 class="text-4xl font-bold mb-4">
        Blog de la Comunidad
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Historias, guías y crónicas de nuestros mundos
      </p>
    </header>

    <div class="flex flex-col md:flex-row gap-4 mb-8 justify-between items-center">
      <div class="relative w-full md:w-96">
        <UInput
          v-model="search"
          placeholder="Buscar posts..."
          icon="i-lucide-search"
          class="w-full"
        />
      </div>

      <div class="flex flex-wrap gap-2 justify-center">
        <UButton
          v-if="selectedTag"
          variant="ghost"
          color="neutral"
          icon="i-lucide-x"
          @click="selectedTag = null"
        >
          Limpiar filtro
        </UButton>
        <UButton
          v-for="tag in allTags"
          :key="tag"
          variant="ghost"
          color="neutral"
          :class="{ 'bg-primary-500 text-white': selectedTag === tag }"
          @click="selectedTag = tag"
        >
          #{{ tag }}
        </UButton>
      </div>
    </div>

    <div
      v-if="pending"
      class="flex justify-center py-20"
    >
      <LoadingIcon />
    </div>

    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
    >
      <UCard
        v-for="item in filteredPosts"
        :key="item.post.id"
        class="flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        @click="navigateTo(`/blog/${item.post.slug}`)"
      >
        <template #header>
          <div class="aspect-video w-full overflow-hidden bg-gray-200 dark:bg-gray-800 relative">
            <img
              v-if="item.post.thumbnail"
              :src="item.post.thumbnail"
              class="object-cover w-full h-full"
              alt="Thumbnail"
            >
            <div
              v-else
              class="flex items-center justify-center h-full text-gray-400"
            >
              <UIcon
                name="i-lucide-image"
                class="w-12 h-12"
              />
            </div>
          </div>
        </template>

        <div class="flex-1">
          <div class="flex gap-2 mb-2">
            <UBadge
              v-for="tag in item.tags"
              :key="tag.id"
              variant="soft"
              color="primary"
              size="xs"
            >
              {{ tag.name }}
            </UBadge>
          </div>
          <h2 class="text-xl font-bold mb-2 line-clamp-2">
            {{ item.post.title }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4">
            {{ item.post.excerpt || 'Sin resumen disponible...' }}
          </p>
        </div>

        <template #footer>
          <div class="flex justify-between items-center text-xs text-gray-500">
            <span>{{ new Date(item.post.created_at).toLocaleDateString() }}</span>
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-arrow-right" />
            </span>
          </div>
        </template>
      </UCard>
    </div>

    <div
      v-if="filteredPosts.length === 0"
      class="text-center py-20"
    >
      <p class="text-gray-500">
        No se encontraron posts que coincidan con tu búsqueda.
      </p>
    </div>
  </div>
</template>

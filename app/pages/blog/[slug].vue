<script setup lang="ts">
import type { BlogPostDetail, BlogTag } from '~/types/blog'
import { markdownToPlainText } from '~/utils/markdown'
import { truncateText } from '~/utils/text'

definePageMeta({
  key: route => route.fullPath
})

const route = useRoute()
const client = useSupabaseClient()
const toast = useToast()
const requestUrl = useRequestURL()
const redirectInfo = useSupabaseCookieRedirect()

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
    author: authors?.[0] ?? null,
    // Se calcula en el servidor y viaja en el payload: mismo texto al hidratar.
    publishedAt: formatDateEsUtc(data.created_at)
  } as BlogPostDetail
}

// SSR + lectura individual del post. La key incluye el slug para no reutilizar
// el post anterior al navegar entre artículos.
const { data: postData, error: postError, pending } = await useAsyncData(
  `blog-post-${slug}`,
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

// Necesario para mostrar la identidad del autor en comentarios recién creados.
const profileStore = useCurrentProfileStore()
await profileStore.refresh()

const {
  liked,
  likeCount,
  comments,
  commentCount,
  canInteract,
  isLoadingLikes,
  isLoadingComments,
  isTogglingLike,
  loadLikeState,
  toggleLike,
  loadComments,
  addComment,
  editComment,
  deleteComment,
  loadCommentHistory
} = useBlogInteractions(post.value.id)

const commentsError = ref('')
const likesError = ref('')
const hasLoadedComments = ref(false)

function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'No se pudieron cargar los comentarios'
}

async function refreshComments() {
  commentsError.value = ''
  try {
    await loadComments()
  } catch (error) {
    commentsError.value = errorText(error)
  } finally {
    hasLoadedComments.value = true
  }
}

async function refreshLikes() {
  likesError.value = ''
  try {
    await loadLikeState()
  } catch (error) {
    likesError.value = errorText(error)
  }
}

onMounted(() => {
  void refreshComments()
  void refreshLikes()
})

async function handleToggleLike() {
  if (!canInteract.value) return
  await toggleLike()
}

// El redirect automático de @nuxtjs/supabase solo cubre /admin; para volver al
// post después del login guardamos el destino manualmente.
function rememberRedirect() {
  redirectInfo.path.value = route.fullPath
}

async function submitRootComment(content: string) {
  await addComment(content)
  toast.add({
    title: 'Comentario publicado',
    color: 'success'
  })
}

const replyAction = (parentId: string, content: string) => addComment(content, parentId)
const editAction = (commentId: string, content: string) => editComment(commentId, content)
const deleteAction = (commentId: string) => deleteComment(commentId)
const historyAction = (commentId: string) => loadCommentHistory(commentId)

const origin = requestUrl.origin
const postUrl = computed(() => `${origin}/blog/${post.value.slug}`)
const description = computed(() => {
  const excerpt = post.value.excerpt?.trim()
  return truncateText(excerpt || markdownToPlainText(post.value.content), 160)
})

async function copyPostLink(): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      throw new Error('El portapapeles no está disponible')
    }

    await navigator.clipboard.writeText(postUrl.value)
    toast.add({
      title: 'Enlace copiado',
      description: 'Pégalo donde quieras compartirlo.',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'No se pudo copiar el enlace',
      description: postUrl.value,
      color: 'error'
    })
  }
}

async function sharePost(): Promise<void> {
  const shareData = {
    title: post.value.title,
    text: description.value,
    url: postUrl.value
  }

  // Web Share API: en móvil abre el menú nativo del sistema.
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData)
      return
    } catch (error) {
      // Si el usuario cancela el diálogo nativo, no copiamos el enlace.
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }

  // Fallback para escritorio o navegadores sin Web Share.
  await copyPostLink()
}

useSeoMeta({
  title: () => `${post.value.title} | Dagas y Dados`,
  description: () => description.value,
  ogTitle: () => post.value.title,
  ogDescription: () => description.value,
  ogType: 'article',
  ogSiteName: 'Dagas y Dados',
  ogUrl: () => postUrl.value,
  ogImage: () => post.value.thumbnail || undefined,
  articlePublishedTime: () => post.value.created_at,
  twitterCard: 'summary_large_image',
  twitterTitle: () => post.value.title,
  twitterDescription: () => description.value,
  twitterImage: () => post.value.thumbnail || undefined
})

useHead(() => ({
  link: [
    { rel: 'canonical', href: postUrl.value }
  ]
}))
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
            <time :datetime="post.created_at">{{ post.publishedAt }}</time>
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

      <div class="mt-10 flex flex-wrap items-center gap-4 border-y border-gray-200 dark:border-gray-800 py-4">
        <UButton
          icon="i-lucide-heart"
          :color="liked ? 'error' : 'neutral'"
          :variant="liked ? 'soft' : 'outline'"
          :loading="isTogglingLike"
          :disabled="!canInteract || isLoadingLikes"
          :aria-label="liked ? 'Quitar me gusta' : 'Me gusta'"
          class="cursor-pointer"
          @click="handleToggleLike"
        >
          {{ likeCount }}
        </UButton>
        <span class="text-sm text-gray-500">
          {{ likeCount === 0 ? 'sin me gusta todavía' : likeCount === 1 ? 'persona le dio me gusta' : 'personas le dieron me gusta' }}
        </span>
        <span class="text-sm text-gray-400">·</span>
        <span class="text-sm text-gray-500">
          {{ commentCount }} {{ commentCount === 1 ? 'comentario' : 'comentarios' }}
        </span>
        <NuxtLink
          v-if="!canInteract"
          to="/login"
          class="text-sm text-primary-600 hover:underline"
          @click="rememberRedirect"
        >
          Inicia sesión para interactuar
        </NuxtLink>
        <UButton
          icon="i-lucide-share-2"
          label="Compartir"
          color="neutral"
          variant="outline"
          class="cursor-pointer sm:ml-auto"
          @click="sharePost"
        />
      </div>
      <p
        v-if="likesError"
        class="mt-2 text-sm text-red-600"
        role="alert"
      >
        {{ likesError }}
      </p>

      <section class="mt-10">
        <div class="flex items-center justify-between gap-2 mb-6">
          <h2 class="text-2xl font-bold">
            Comentarios
          </h2>
          <span class="text-sm text-gray-500">{{ commentCount }}</span>
        </div>

        <div
          v-if="canInteract"
          class="mb-8"
        >
          <BlogCommentForm
            :submit-action="submitRootComment"
            placeholder="Comparte tu opinión..."
          />
        </div>
        <div
          v-else
          class="mb-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-400"
        >
          <NuxtLink
            to="/login"
            class="text-primary-600 hover:underline"
            @click="rememberRedirect"
          >Inicia sesión</NuxtLink>
          para dejar un comentario.
        </div>

        <div
          v-if="isLoadingComments || !hasLoadedComments"
          class="flex justify-center py-10"
        >
          <LoadingIcon />
        </div>

        <div
          v-else-if="commentsError"
          class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <p>{{ commentsError }}</p>
          <UButton
            label="Reintentar"
            size="sm"
            variant="ghost"
            color="error"
            class="mt-2 cursor-pointer"
            @click="refreshComments"
          />
        </div>

        <div
          v-else-if="comments.length === 0"
          class="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-sm text-gray-500"
        >
          Todavía no hay comentarios. Sé el primero en participar.
        </div>

        <div
          v-else
          class="space-y-4"
        >
          <BlogComment
            v-for="comment in comments"
            :key="comment.id"
            :comment="comment"
            :can-moderate="isAdmin"
            :reply-action="replyAction"
            :edit-action="editAction"
            :delete-action="deleteAction"
            :history-action="historyAction"
          />
        </div>
      </section>
    </div>

    <div
      v-else-if="pending"
      class="flex justify-center py-20"
    >
      <LoadingIcon />
    </div>
  </div>
</template>

import type {
  BlogComment,
  BlogCommentAuthorRef,
  BlogCommentHistoryEntry,
  BlogCommentLikeCount
} from '~/types/blog'
import { BLOG_COMMENT_MAX_LENGTH } from '~/types/blog'

export interface BlogCommentRow {
  id: string
  post_id: string
  user_id: string | null
  parent_id: string | null
  content: string
  depth: number
  created_at: string
  updated_at: string
}

const byCreatedAt = (a: BlogComment, b: BlogComment): number =>
  a.created_at.localeCompare(b.created_at)

/**
 * Convierte filas planas de Supabase en un árbol de comentarios.
 * Es una función pura para poder testearla sin Nuxt ni Supabase.
 */
export function buildCommentTree(
  rows: BlogCommentRow[],
  authors: Map<string, BlogCommentAuthorRef>
): BlogComment[] {
  const nodes = new Map<string, BlogComment>()

  for (const row of rows) {
    nodes.set(row.id, {
      ...row,
      author: row.user_id ? (authors.get(row.user_id) ?? null) : null,
      replies: []
    })
  }

  const roots: BlogComment[] = []

  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined
    if (parent) {
      parent.replies.push(node)
    } else {
      // Un padre inexistente solo puede pasar por datos corruptos; se muestra
      // como raíz para no perder el comentario.
      roots.push(node)
    }
  }

  roots.sort(byCreatedAt)
  for (const node of nodes.values()) {
    node.replies.sort(byCreatedAt)
  }

  return roots
}

export function countComments(nodes: BlogComment[]): number {
  return nodes.reduce((total, node) => total + 1 + countComments(node.replies), 0)
}

function appendComment(nodes: BlogComment[], node: BlogComment): boolean {
  if (node.parent_id === null) {
    nodes.push(node)
    return true
  }

  for (const candidate of nodes) {
    if (candidate.id === node.parent_id) {
      candidate.replies.push(node)
      return true
    }
    if (appendComment(candidate.replies, node)) return true
  }

  return false
}

function findComment(nodes: BlogComment[], commentId: string): BlogComment | null {
  for (const node of nodes) {
    if (node.id === commentId) return node
    const found = findComment(node.replies, commentId)
    if (found) return found
  }
  return null
}

function removeComment(nodes: BlogComment[], commentId: string): boolean {
  const index = nodes.findIndex(node => node.id === commentId)
  if (index !== -1) {
    nodes.splice(index, 1)
    return true
  }

  for (const node of nodes) {
    if (removeComment(node.replies, commentId)) return true
  }

  return false
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Error inesperado'
}

export function useBlogInteractions(postId: string) {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()
  const profileStore = useCurrentProfileStore()

  const liked = ref(false)
  const likeCount = ref(0)
  const comments = ref<BlogComment[]>([])
  const isLoadingLikes = ref(false)
  const isLoadingComments = ref(false)
  const isTogglingLike = ref(false)
  const isSubmitting = ref(false)

  const userId = computed(() => user.value?.sub ?? null)
  const canInteract = computed(() => Boolean(userId.value))
  const commentCount = computed(() => countComments(comments.value))

  const ownAuthor = (): BlogCommentAuthorRef | null => {
    if (!userId.value) return null
    return {
      id: userId.value,
      user_name: profileStore.master?.user_name ?? null,
      full_name: profileStore.master?.full_name ?? null,
      avatar_url: profileStore.master?.avatar_url ?? null
    }
  }

  async function loadLikeState(): Promise<BlogCommentLikeCount> {
    isLoadingLikes.value = true
    try {
      const [countResult, ownResult] = await Promise.all([
        client
          .from('blog_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
        userId.value
          ? client
              .from('blog_likes')
              .select('id')
              .eq('post_id', postId)
              .eq('user_id', userId.value)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null })
      ])

      if (countResult.error) throw countResult.error
      if (ownResult.error) throw ownResult.error

      likeCount.value = countResult.count ?? 0
      liked.value = Boolean(ownResult.data)

      return { count: likeCount.value, liked: liked.value }
    } finally {
      isLoadingLikes.value = false
    }
  }

  async function toggleLike(): Promise<boolean> {
    if (!userId.value || isTogglingLike.value) return false

    const previousLiked = liked.value
    const previousCount = likeCount.value

    liked.value = !previousLiked
    likeCount.value = Math.max(0, previousCount + (liked.value ? 1 : -1))
    isTogglingLike.value = true

    try {
      if (previousLiked) {
        const { error } = await client
          .from('blog_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId.value)

        if (error) throw error
      } else {
        const { error } = await client
          .from('blog_likes')
          .insert({ post_id: postId, user_id: userId.value })

        // 23505: unique violation, el like ya existía (p. ej. doble clic).
        if (error && error.code !== '23505') throw error
      }

      return true
    } catch (error) {
      liked.value = previousLiked
      likeCount.value = previousCount
      toast.add({
        title: 'No se pudo actualizar el like',
        description: errorMessage(error),
        color: 'error'
      })
      return false
    } finally {
      isTogglingLike.value = false
    }
  }

  async function loadComments(): Promise<void> {
    isLoadingComments.value = true
    try {
      const { data, error } = await client
        .from('blog_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const rows = (data ?? []) as BlogCommentRow[]
      const authorIds = [
        ...new Set(
          rows
            .map(row => row.user_id)
            .filter((id): id is string => id !== null)
        )
      ]
      const authors = new Map<string, BlogCommentAuthorRef>()

      if (authorIds.length > 0) {
        // La identidad es accesoria: si la RPC falla se muestran los
        // comentarios igualmente (sin nombre) en lugar de romper la página.
        const { data: authorsData, error: authorsError } = await client.rpc('blog_comment_authors', {
          p_user_ids: authorIds
        })

        if (authorsError) {
          console.warn('[blog] no se pudieron resolver los autores de los comentarios', authorsError.message)
        } else {
          (authorsData as BlogCommentAuthorRef[] | null)?.forEach((author) => {
            authors.set(author.id, author)
          })
        }
      }

      comments.value = buildCommentTree(rows, authors)
    } finally {
      isLoadingComments.value = false
    }
  }

  function validateContent(content: string): string {
    const trimmed = content.trim()

    if (!trimmed) throw new Error('El comentario no puede estar vacío')
    if (trimmed.length > BLOG_COMMENT_MAX_LENGTH) {
      throw new Error(`El comentario no puede superar los ${BLOG_COMMENT_MAX_LENGTH} caracteres`)
    }

    return trimmed
  }

  async function addComment(content: string, parentId: string | null = null): Promise<BlogComment | null> {
    if (!userId.value) throw new Error('Debes iniciar sesión para comentar')

    const trimmed = validateContent(content)
    isSubmitting.value = true

    try {
      const { data, error } = await client
        .from('blog_comments')
        .insert({
          post_id: postId,
          user_id: userId.value,
          parent_id: parentId,
          content: trimmed
        })
        .select('*')
        .single()

      if (error) throw error

      const node: BlogComment = {
        ...(data as BlogCommentRow),
        author: ownAuthor(),
        replies: []
      }

      appendComment(comments.value, node)
      return node
    } finally {
      isSubmitting.value = false
    }
  }

  async function editComment(commentId: string, newContent: string): Promise<BlogComment | null> {
    if (!userId.value) throw new Error('Debes iniciar sesión para editar')

    const trimmed = validateContent(newContent)
    isSubmitting.value = true

    try {
      const { data, error } = await client
        .from('blog_comments')
        .update({ content: trimmed })
        .eq('id', commentId)
        .eq('user_id', userId.value)
        .select('*')
        .single()

      if (error) throw error

      const row = data as BlogCommentRow
      const node = findComment(comments.value, commentId)
      if (node) {
        node.content = row.content
        node.updated_at = row.updated_at
      }

      return node
    } finally {
      isSubmitting.value = false
    }
  }

  async function deleteComment(commentId: string): Promise<void> {
    isSubmitting.value = true

    try {
      const { error } = await client
        .from('blog_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      removeComment(comments.value, commentId)
    } finally {
      isSubmitting.value = false
    }
  }

  async function loadCommentHistory(commentId: string): Promise<BlogCommentHistoryEntry[]> {
    const { data, error } = await client
      .from('blog_comment_history')
      .select('*')
      .eq('comment_id', commentId)
      .order('changed_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as BlogCommentHistoryEntry[]
  }

  return {
    liked,
    likeCount,
    comments,
    commentCount,
    canInteract,
    isLoadingLikes,
    isLoadingComments,
    isTogglingLike,
    isSubmitting,
    loadLikeState,
    toggleLike,
    loadComments,
    addComment,
    editComment,
    deleteComment,
    loadCommentHistory
  }
}

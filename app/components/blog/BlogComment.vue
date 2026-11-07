<script setup lang="ts">
import type { BlogComment, BlogCommentHistoryEntry } from '~/types/blog'
import { BLOG_COMMENT_MAX_DEPTH } from '~/types/blog'

const props = withDefaults(defineProps<{
  comment: BlogComment
  canModerate?: boolean
  maxDepth?: number
  replyAction?: (parentId: string, content: string) => Promise<unknown>
  editAction?: (commentId: string, content: string) => Promise<unknown>
  deleteAction?: (commentId: string) => Promise<unknown>
  historyAction?: (commentId: string) => Promise<BlogCommentHistoryEntry[]>
}>(), {
  canModerate: false,
  maxDepth: BLOG_COMMENT_MAX_DEPTH
})

const user = useSupabaseUser()
const toast = useToast()

const isReplying = ref(false)
const isEditing = ref(false)
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)
const isHistoryOpen = ref(false)
const isLoadingHistory = ref(false)
const history = ref<BlogCommentHistoryEntry[]>([])

const authorName = computed(() =>
  props.comment.author?.user_name
  || props.comment.author?.full_name
  || 'Anónimo'
)

const authorInitial = computed(() => authorName.value.charAt(0).toUpperCase())

const isOwn = computed(() => Boolean(user.value?.sub) && user.value?.sub === props.comment.user_id)
const canEdit = computed(() => isOwn.value && Boolean(props.editAction))
const canDelete = computed(() => (isOwn.value || props.canModerate) && Boolean(props.deleteAction))
const canReply = computed(() => props.comment.depth < props.maxDepth && Boolean(props.replyAction))
const canViewHistory = computed(() => (isOwn.value || props.canModerate) && Boolean(props.historyAction))
const showEdited = computed(() =>
  new Date(props.comment.updated_at).getTime() > new Date(props.comment.created_at).getTime()
)

async function submitReply(content: string) {
  if (!props.replyAction) return
  await props.replyAction(props.comment.id, content)
}

async function submitEdit(content: string) {
  if (!props.editAction) return
  await props.editAction(props.comment.id, content)
}

async function confirmDelete() {
  if (!props.deleteAction || isDeleting.value) return

  isDeleting.value = true
  try {
    await props.deleteAction(props.comment.id)
    showDeleteConfirm.value = false
  } catch (error) {
    toast.add({
      title: 'No se pudo eliminar el comentario',
      description: error instanceof Error ? error.message : 'Error inesperado',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
  }
}

async function openHistory() {
  if (!props.historyAction) return

  isHistoryOpen.value = true
  isLoadingHistory.value = true
  history.value = []

  try {
    history.value = await props.historyAction(props.comment.id)
  } catch (error) {
    toast.add({
      title: 'No se pudo cargar el historial',
      description: error instanceof Error ? error.message : 'Error inesperado',
      color: 'error'
    })
  } finally {
    isLoadingHistory.value = false
  }
}
</script>

<template>
  <article
    class="rounded-lg border border-gray-200 dark:border-gray-800 p-4"
    :class="{ 'opacity-70': comment.isOptimistic }"
  >
    <header class="flex items-start gap-3">
      <UAvatar
        :src="comment.author?.avatar_url || undefined"
        :text="authorInitial"
        size="sm"
        class="shrink-0"
      />

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span class="font-semibold truncate">{{ authorName }}</span>
          <span class="text-gray-500">
            <time :datetime="comment.created_at">{{ formatDateEsUtc(comment.created_at) }}</time>
          </span>
          <UBadge
            v-if="showEdited"
            variant="soft"
            color="neutral"
            size="xs"
          >
            editado
          </UBadge>
          <UBadge
            v-if="comment.isOptimistic"
            variant="soft"
            color="info"
            size="xs"
          >
            enviando…
          </UBadge>
        </div>

        <div
          v-if="isEditing"
          class="mt-3"
        >
          <BlogCommentForm
            :submit-action="submitEdit"
            :initial-value="comment.content"
            submit-label="Guardar"
            show-cancel
            @submitted="isEditing = false"
            @cancel="isEditing = false"
          />
        </div>

        <p
          v-else
          class="mt-2 text-sm whitespace-pre-line break-words"
        >
          {{ comment.content }}
        </p>

        <div class="mt-3 flex flex-wrap items-center gap-1">
          <UButton
            v-if="canReply"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-reply"
            label="Responder"
            class="cursor-pointer"
            @click="isReplying = !isReplying"
          />
          <UButton
            v-if="canEdit"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-pencil"
            label="Editar"
            class="cursor-pointer"
            @click="isEditing = !isEditing"
          />
          <UButton
            v-if="canViewHistory"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-history"
            label="Historial"
            class="cursor-pointer"
            @click="openHistory"
          />
          <UButton
            v-if="canDelete"
            size="xs"
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            label="Eliminar"
            class="cursor-pointer"
            @click="showDeleteConfirm = true"
          />
        </div>

        <p
          v-if="comment.depth >= maxDepth"
          class="mt-2 text-xs text-gray-500"
        >
          Se alcanzó el máximo de anidamiento para este hilo.
        </p>

        <div
          v-if="isReplying"
          class="mt-3"
        >
          <BlogCommentForm
            :submit-action="submitReply"
            submit-label="Responder"
            placeholder="Escribe tu respuesta..."
            show-cancel
            @submitted="isReplying = false"
            @cancel="isReplying = false"
          />
        </div>
      </div>
    </header>

    <div
      v-if="comment.replies.length > 0"
      class="mt-4 space-y-3 border-l-2 border-gray-200 dark:border-gray-800 pl-3 sm:pl-4"
    >
      <BlogComment
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :can-moderate="canModerate"
        :max-depth="maxDepth"
        :reply-action="replyAction"
        :edit-action="editAction"
        :delete-action="deleteAction"
        :history-action="historyAction"
      />
    </div>

    <UModal
      v-if="showDeleteConfirm"
      v-model:open="showDeleteConfirm"
      title="Eliminar comentario"
    >
      <template #body>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Esta acción también eliminará las respuestas del hilo y no se puede deshacer.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="ghost"
            class="cursor-pointer"
            @click="showDeleteConfirm = false"
          />
          <UButton
            label="Eliminar"
            color="error"
            :loading="isDeleting"
            class="cursor-pointer"
            @click="confirmDelete"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-if="isHistoryOpen"
      v-model:open="isHistoryOpen"
      title="Historial de ediciones"
    >
      <template #body>
        <div
          v-if="isLoadingHistory"
          class="flex justify-center py-6"
        >
          <LoadingIcon />
        </div>
        <p
          v-else-if="history.length === 0"
          class="text-sm text-gray-500"
        >
          Este comentario no tiene ediciones anteriores.
        </p>
        <ul
          v-else
          class="space-y-4"
        >
          <li
            v-for="entry in history"
            :key="entry.id"
            class="rounded-lg border border-gray-200 dark:border-gray-800 p-3"
          >
            <p class="text-xs text-gray-500 mb-1">
              {{ formatDateEsUtc(entry.changed_at) }}
            </p>
            <p class="text-sm whitespace-pre-line break-words">
              {{ entry.old_content }}
            </p>
          </li>
        </ul>
      </template>
    </UModal>
  </article>
</template>

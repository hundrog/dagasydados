<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useClipboard } from '@vueuse/core'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { Row } from '@tanstack/vue-table'
import type { BlogPostSummary } from '~/types/blog'
import { useBlogImage } from '~/composables/useBlogImage'

const supabase = useSupabaseClient()
const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()
const { copy } = useClipboard()
const adminStore = useAdminStore()
const { isAdmin } = storeToRefs(adminStore)
const { deleteBlogImageByUrl } = useBlogImage()
const table = useTemplateRef('table')

await adminStore.refresh()

if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: 'Acceso denegado' })
}

const posts = ref<BlogPostSummary[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const pendingDelete = ref<BlogPostSummary | null>(null)
const isDeleteOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (value: boolean) => {
    if (!value) pendingDelete.value = null
  }
})
const isDeleting = ref(false)

const loadPosts = async () => {
  isLoading.value = true
  errorMessage.value = null

  const { data, error } = await supabase
    .from('blog_posts')
    .select('id,slug,title,status,created_at,author_id,thumbnail')
    .order('created_at', { ascending: false })

  if (error) {
    errorMessage.value = error.message
    isLoading.value = false
    return
  }

  const rows = data ?? []
  const authorIds = [...new Set(rows.map(row => row.author_id))]
  const authors = new Map<string, BlogPostSummary['author']>()

  if (authorIds.length > 0) {
    const { data: authorsData, error: authorsError } = await supabase
      .from('dagger_masters')
      .select('id,full_name,user_name')
      .in('id', authorIds)

    if (authorsError) {
      errorMessage.value = authorsError.message
      isLoading.value = false
      return
    }

    authorsData?.forEach((author) => {
      authors.set(author.id, author)
    })
  }

  posts.value = rows.map(row => ({
    ...row,
    author: authors.get(row.author_id) ?? null
  }))

  isLoading.value = false
}

onMounted(loadPosts)

const confirmDelete = async () => {
  if (!pendingDelete.value || isDeleting.value) return

  isDeleting.value = true

  await deleteBlogImageByUrl(pendingDelete.value.thumbnail)

  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', pendingDelete.value.id)

  isDeleting.value = false

  if (error) {
    toast.add({
      title: 'No se pudo borrar el post',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-octagon-x'
    })
    return
  }

  toast.add({
    title: 'Post borrado',
    color: 'success',
    icon: 'i-lucide-trash-2'
  })

  pendingDelete.value = null
  await loadPosts()
}

const toggleStatus = async (post: BlogPostSummary) => {
  const nextStatus = post.status === 'published' ? 'draft' : 'published'

  const { error } = await supabase
    .from('blog_posts')
    .update({ status: nextStatus })
    .eq('id', post.id)

  if (error) {
    toast.add({
      title: 'No se pudo cambiar el estado',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-octagon-x'
    })
    return
  }

  post.status = nextStatus

  toast.add({
    title: nextStatus === 'published' ? 'Post publicado' : 'Post movido a borrador',
    color: 'success',
    icon: nextStatus === 'published' ? 'i-lucide-send' : 'i-lucide-eye-off'
  })
}

const goToCreate = () => {
  navigateTo('/admin/blog/new')
}

const goToEdit = (slug: string) => {
  navigateTo(`/admin/blog/${slug}/edit`)
}

const columns: TableColumn<BlogPostSummary>[] = [
  {
    accessorKey: 'title',
    header: 'Título'
  },
  {
    id: 'author',
    header: 'Autor',
    cell: ({ row }) =>
      row.original.author?.full_name || row.original.author?.user_name || '-'
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const isPublished = row.original.status === 'published'
      return h(
        UBadge,
        {
          color: isPublished ? 'primary' : 'neutral',
          variant: 'subtle'
        },
        () => isPublished ? 'Publicado' : 'Borrador'
      )
    }
  },
  {
    id: 'actions',
    meta: {
      class: {
        td: 'text-right'
      }
    },
    cell: ({ row }) => {
      return h(
        UDropdownMenu,
        {
          'content': {
            align: 'end'
          },
          'items': getRowItems(row),
          'aria-label': 'Actions dropdown'
        },
        () =>
          h(UButton, {
            'icon': 'i-lucide-ellipsis-vertical',
            'color': 'neutral',
            'variant': 'ghost',
            'aria-label': 'Actions dropdown'
          })
      )
    }
  }
]

function getRowItems(row: Row<BlogPostSummary>) {
  const post = row.original

  return [
    {
      type: 'label',
      label: 'Acciones'
    },
    {
      label: 'Ver post',
      icon: 'i-lucide-eye',
      onSelect() {
        navigateTo(`/blog/${post.slug}`)
      }
    },
    {
      label: 'Copiar link',
      icon: 'i-lucide-link',
      onSelect() {
        copy(`${window.location.origin}/blog/${post.slug}`)

        toast.add({
          title: 'Link copiado al portapapeles!',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    },
    {
      label: 'Copiar ID',
      onSelect() {
        copy(post.id)

        toast.add({
          title: 'ID copiado al portapapeles!',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: post.status === 'published' ? 'Volver a borrador' : 'Publicar post',
      icon: post.status === 'published' ? 'i-lucide-eye-off' : 'i-lucide-send',
      onSelect() {
        toggleStatus(post)
      }
    },
    {
      label: 'Editar post',
      icon: 'i-lucide-pencil',
      onSelect() {
        goToEdit(post.slug)
      }
    },
    {
      label: 'Borrar post',
      icon: 'i-lucide-trash-2',
      color: 'danger',
      onSelect() {
        pendingDelete.value = post
      }
    }
  ]
}

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-primary-900">
          Blog
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Administra las entradas del blog de la comunidad.
        </p>
      </div>
      <UButton
        label="Nuevo Post"
        icon="i-lucide-plus"
        class="cursor-pointer"
        @click="goToCreate"
      />
    </div>

    <div
      v-if="isLoading"
      class="flex justify-center py-12"
    >
      <LoadingIcon />
    </div>
    <div
      v-else-if="errorMessage"
      class="p-4 text-sm text-red-600"
    >
      {{ errorMessage }}
    </div>
    <template v-else>
      <UTable
        ref="table"
        v-model:pagination="pagination"
        :data="posts"
        :columns="columns"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        class="flex-1"
      />
      <div class="flex justify-end border-t border-default pt-4 px-4">
        <UPagination
          :page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>
    </template>

    <UModal
      v-model:open="isDeleteOpen"
      title="Borrar post"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-slate-600">
            ¿Borrar el post
            <span class="font-semibold text-primary-900">
              {{ pendingDelete?.title || 'este post' }}
            </span>?
            Esta acción no se puede deshacer.
          </p>

          <div class="flex justify-end gap-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="ghost"
              class="cursor-pointer"
              :disabled="isDeleting"
              @click="pendingDelete = null"
            />
            <UButton
              label="Borrar"
              color="error"
              class="cursor-pointer"
              :loading="isDeleting"
              @click="confirmDelete"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

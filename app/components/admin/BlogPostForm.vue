<script setup lang="ts">
import { slugify } from '~/utils/url'
import type { BlogPost, BlogPostWithTags } from '~/types/blog'
import { useBlogImage } from '~/composables/useBlogImage'

const props = defineProps<{
  post?: BlogPostWithTags | null
}>()

const emit = defineEmits<{
  saved: [BlogPost]
  cancel: []
}>()

const client = useSupabaseClient()
const user = useSupabaseUser()
const { uploadBlogImage } = useBlogImage()

const createState = () => ({
  title: props.post?.title ?? '',
  content: props.post?.content ?? '',
  excerpt: props.post?.excerpt ?? '',
  thumbnail: props.post?.thumbnail ?? '',
  status: (props.post?.status ?? 'draft') as 'draft' | 'published',
  tags: (props.post?.tags ?? []).map(tag => tag.name).join(', ')
})

const form = ref(createState())
const isSubmitting = ref(false)
const errorMessage = ref('')
const showCheatsheet = ref(false)
const selectedFile = ref<File | null>(null)

watch(
  () => props.post,
  () => {
    form.value = createState()
  }
)

watch(selectedFile, (file) => {
  if (file) uploadImage(file)
})

async function uploadImage(file: File) {
  try {
    form.value.thumbnail = await uploadBlogImage(file)
  } catch (e: unknown) {
    errorMessage.value = 'Error subiendo la imagen: ' + (e instanceof Error ? e.message : String(e))
  }
}

const parseTags = (value: string): string[] =>
  value.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean)

async function syncTags(postId: string, tags: string[]) {
  const { error: deleteError } = await client
    .from('blog_posts_tags')
    .delete()
    .eq('post_id', postId)

  if (deleteError) throw deleteError

  for (const name of tags) {
    const { data: tag, error: tagError } = await client
      .from('blog_tags')
      .upsert({ name }, { onConflict: 'name' })
      .select()
      .single()

    if (tagError) throw tagError
    if (!tag) continue

    const { error: linkError } = await client
      .from('blog_posts_tags')
      .insert({ post_id: postId, tag_id: tag.id })

    if (linkError) throw linkError
  }
}

async function savePost() {
  if (isSubmitting.value) return

  errorMessage.value = ''

  const title = form.value.title.trim()
  const content = form.value.content.trim()

  if (!title) {
    errorMessage.value = 'El título es obligatorio'
    return
  }

  if (!content) {
    errorMessage.value = 'El contenido es obligatorio'
    return
  }

  const slug = slugify(title)
  if (!slug) {
    errorMessage.value = 'No se pudo generar una URL válida a partir del título'
    return
  }

  isSubmitting.value = true

  try {
    const payload = {
      slug,
      title,
      content,
      excerpt: form.value.excerpt.trim() || null,
      thumbnail: form.value.thumbnail.trim() || null,
      status: form.value.status
    }

    let saved: BlogPost

    if (props.post?.id) {
      const { data, error } = await client
        .from('blog_posts')
        .update(payload)
        .eq('id', props.post.id)
        .select()
        .single()

      if (error) throw error
      saved = data
    } else {
      const authorId = user.value?.sub
      if (!authorId) throw new Error('No se pudo identificar al autor del post')

      const { data, error } = await client
        .from('blog_posts')
        .insert({ ...payload, author_id: authorId })
        .select()
        .single()

      if (error) throw error
      saved = data
    }

    await syncTags(saved.id, parseTags(form.value.tags))

    emit('saved', saved)
  } catch (e: unknown) {
    errorMessage.value = e instanceof Error ? e.message : String(e)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UForm
    :state="form"
    class="w-full space-y-8"
    @submit="savePost"
  >
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-primary-900">
        Información básica
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField
          label="Título"
          name="title"
          required
        >
          <UInput
            v-model="form.title"
            class="w-full"
            placeholder="Título del post"
          />
        </UFormField>
        <UFormField
          label="Estado"
          name="status"
        >
          <USelect
            v-model="form.status"
            :options="['draft', 'published']"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Resumen (Excerpt)"
          name="excerpt"
          class="md:col-span-2"
        >
          <UInput
            v-model="form.excerpt"
            class="w-full"
            placeholder="Breve resumen para la tarjeta del feed"
          />
        </UFormField>
        <UFormField
          label="Tags (separados por coma)"
          name="tags"
          class="md:col-span-2"
        >
          <UInput
            v-model="form.tags"
            class="w-full"
            placeholder="rpg, dnd, guia, lore"
          />
        </UFormField>
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-primary-900">
        Imagen de portada
      </h2>
      <UFormField
        label="Imagen de Portada"
        name="thumbnail"
      >
        <div class="space-y-4">
          <div
            v-if="form.thumbnail"
            class="relative w-full max-w-sm"
          >
            <img
              :src="form.thumbnail"
              alt="Vista previa de la portada"
              class="w-full h-48 object-cover rounded-lg border border-slate-200"
            >
          </div>
          <UFileUpload
            v-model="selectedFile"
            accept="image/*"
            label="Subir imagen"
            description="JPG, PNG o WebP · Máximo 5 MB"
          />
          <UInput
            v-model="form.thumbnail"
            readonly
            class="w-full"
            placeholder="URL de la imagen"
          />
        </div>
      </UFormField>
    </section>

    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-primary-900">
        Contenido
      </h2>
      <UFormField
        name="content"
        required
      >
        <template #label>
          Contenido
          <button
            type="button"
            class="ml-1 text-primary-600 underline underline-offset-2 hover:text-primary-700"
            @click="showCheatsheet = true"
          >
            (Markdown)
          </button>
        </template>
        <UTextarea
          v-model="form.content"
          class="w-full"
          :rows="20"
          placeholder="Escribe tu historia aquí usando Markdown..."
        />
      </UFormField>
    </section>

    <div
      v-if="errorMessage"
      class="p-4 bg-red-100 text-red-700 rounded-lg"
    >
      {{ errorMessage }}
    </div>

    <div class="flex justify-end gap-4">
      <UButton
        variant="ghost"
        @click="emit('cancel')"
      >
        Cancelar
      </UButton>
      <UButton
        type="submit"
        :loading="isSubmitting"
        color="primary"
      >
        {{ post ? 'Guardar Cambios' : 'Guardar Post' }}
      </UButton>
    </div>
  </UForm>

  <MarkdownCheatsheet v-model:open="showCheatsheet" />
</template>

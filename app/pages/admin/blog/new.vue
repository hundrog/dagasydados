<script setup lang="ts">
import { slugify } from '~/utils/url'

const client = useSupabaseClient()
const route = useRoute()

// Protección de ruta: solo usuarios autenticados pueden crear posts
const { data: { user } } = await client.auth.getUser()
if (!user) {
  await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
}

const form = ref({
  title: '',
  content: '',
  excerpt: '',
  thumbnail: '',
  status: 'draft' as 'draft' | 'published',
  tags: ''
})

const loading = ref(false)
const error = ref('')
const showCheatsheet = ref(false)

const selectedFile = ref<File | null>(null)

watch(selectedFile, (file) => {
  if (file) uploadImage(file)
})

async function uploadImage(file: File) {
  try {
    const fileName = `${Date.now()}-${file.name}`
    const { error: uploadError } = await client.storage
      .from('blog-posts')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = client.storage
      .from('blog-posts')
      .getPublicUrl(fileName)

    form.value.thumbnail = publicUrl
  } catch (e: any) {
    error.value = 'Error uploading image: ' + e.message
  }
}

async function savePost() {
  loading.value = true
  error.value = ''

  try {
    const slug = slugify(form.value.title)
    if (!slug) throw new Error('Title is required')

    const postData = {
      slug,
      title: form.value.title,
      content: form.value.content,
      excerpt: form.value.excerpt,
      thumbnail: form.value.thumbnail,
      status: form.value.status,
      author_id: user!.id
    }

    const { data, error: insertError } = await client
      .from('blog_posts')
      .insert(postData)
      .select()
      .single()
    if (insertError) throw insertError
    const post = data

    // Handle Tags
    const tagsArray = form.value.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)

    // 1. Ensure tags exist in blog_tags
    for (const tagName of tagsArray) {
      const { data: tagData } = await client.from('blog_tags').upsert({ name: tagName }, { onConflict: 'name' }).select().single()
      if (tagData) {
        // 2. Link tag to post
        await client.from('blog_posts_tags').upsert({ post_id: post.id, tag_id: tagData.id })
      }
    }

    navigateTo(`/blog/${post.slug}`)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
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
        @click="navigateTo('/blog')"
      />
    </div>

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
        v-if="error"
        class="p-4 bg-red-100 text-red-700 rounded-lg"
      >
        {{ error }}
      </div>

      <div class="flex justify-end gap-4">
        <UButton
          variant="ghost"
          @click="navigateTo('/blog')"
        >
          Cancelar
        </UButton>
        <UButton
          type="submit"
          :loading="loading"
          color="primary"
        >
          Guardar Post
        </UButton>
      </div>
    </UForm>

    <MarkdownCheatsheet v-model:open="showCheatsheet" />
  </div>
</template>

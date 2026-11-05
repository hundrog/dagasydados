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

async function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

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
  <div class="max-w-4xl mx-auto px-4 py-12">
    <h1 class="text-3xl font-bold mb-8">
      Nuevo Post
    </h1>

    <UForm
      :state="form"
      class="space-y-6"
      @submit="savePost"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UFormGroup
          label="Título"
          name="title"
          required
        >
          <UInput
            v-model="form.title"
            placeholder="Título del post"
          />
        </UFormGroup>

        <UFormGroup
          label="Estado"
          name="status"
        >
          <USelect
            v-model="form.status"
            :options="['draft', 'published']"
          />
        </UFormGroup>
      </div>

      <UFormGroup
        label="Resumen (Excerpt)"
        name="excerpt"
      >
        <UInput
          v-model="form.excerpt"
          placeholder="Breve resumen para la tarjeta del feed"
        />
      </UFormGroup>

      <UFormGroup
        label="Tags (separados por coma)"
        name="tags"
      >
        <UInput
          v-model="form.tags"
          placeholder="rpg, dnd, guia, lore"
        />
      </UFormGroup>

      <UFormGroup
        label="Imagen de Portada"
        name="thumbnail"
      >
        <div class="flex items-center gap-4">
          <UInput
            v-model="form.thumbnail"
            readonly
            placeholder="URL de la imagen"
          />
          <UFileInput
            accept="image/*"
            @change="handleImageUpload"
          />
        </div>
      </UFormGroup>

      <UFormGroup
        label="Contenido (Markdown)"
        name="content"
        required
      >
        <UTextarea
          v-model="form.content"
          :rows="15"
          placeholder="Escribe tu historia aquí usando Markdown..."
        />
      </UFormGroup>

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
  </div>
</template>

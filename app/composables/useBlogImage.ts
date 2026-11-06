const BLOG_IMAGES_BUCKET = 'blog-posts'
const BLOG_IMAGES_FOLDER = 'blog'
const BLOG_IMAGES_MARKER = `/storage/v1/object/public/${BLOG_IMAGES_BUCKET}/`

const fileExtension = (name: string): string => {
  const ext = name.split('.').pop()
  return ext && ext.length > 0 && ext.length <= 10 ? `.${ext}` : ''
}

export function useBlogImage() {
  const supabase = useSupabaseClient()
  const supabaseUrl = useRuntimeConfig().public.supabaseUrl

  const isStoredImageUrl = (url: string | null | undefined): boolean => {
    if (!url || !supabaseUrl) return false
    return url.includes(`${supabaseUrl}${BLOG_IMAGES_MARKER}`)
  }

  const pathFromUrl = (url: string): string | null => {
    const index = url.indexOf(BLOG_IMAGES_MARKER)
    if (index === -1) return null
    return url.slice(index + BLOG_IMAGES_MARKER.length)
  }

  const getPublicUrl = (path: string): string => {
    const { data } = supabase.storage.from(BLOG_IMAGES_BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  const uploadBlogImage = async (file: File): Promise<string> => {
    const path = `${BLOG_IMAGES_FOLDER}/${crypto.randomUUID()}${fileExtension(file.name)}`
    const { error } = await supabase.storage
      .from(BLOG_IMAGES_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined
      })
    if (error) throw error
    return getPublicUrl(path)
  }

  const deleteBlogImageByUrl = async (url: string | null | undefined): Promise<void> => {
    if (!isStoredImageUrl(url) || !url) return
    const path = pathFromUrl(url)
    if (!path) return
    const { error } = await supabase.storage.from(BLOG_IMAGES_BUCKET).remove([path])
    if (error) {
      console.warn('No se pudo eliminar la imagen del bucket:', error.message)
    }
  }

  return {
    uploadBlogImage,
    deleteBlogImageByUrl,
    isStoredImageUrl,
    getPublicUrl,
    pathFromUrl
  }
}

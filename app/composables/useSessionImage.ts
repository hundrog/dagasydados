const SESSION_IMAGES_BUCKET = 'game-session-images'
const SESSION_IMAGES_FOLDER = 'sessions'
const SESSION_IMAGES_MARKER = `/storage/v1/object/public/${SESSION_IMAGES_BUCKET}/`

const fileExtension = (name: string): string => {
  const ext = name.split('.').pop()
  return ext && ext.length > 0 && ext.length <= 10 ? `.${ext}` : ''
}

export function useSessionImage() {
  const supabase = useSupabaseClient()
  const supabaseUrl = useRuntimeConfig().public.supabaseUrl

  const isStoredImageUrl = (url: string | null | undefined): boolean => {
    if (!url || !supabaseUrl) return false
    return url.includes(`${supabaseUrl}${SESSION_IMAGES_MARKER}`)
  }

  const pathFromUrl = (url: string): string | null => {
    const index = url.indexOf(SESSION_IMAGES_MARKER)
    if (index === -1) return null
    return url.slice(index + SESSION_IMAGES_MARKER.length)
  }

  const getPublicUrl = (path: string): string => {
    const { data } = supabase.storage.from(SESSION_IMAGES_BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  const uploadSessionImage = async (file: File): Promise<string> => {
    const path = `${SESSION_IMAGES_FOLDER}/${crypto.randomUUID()}${fileExtension(file.name)}`
    const { error } = await supabase.storage
      .from(SESSION_IMAGES_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined
      })
    if (error) throw error
    return getPublicUrl(path)
  }

  const deleteSessionImageByUrl = async (url: string | null | undefined): Promise<void> => {
    if (!isStoredImageUrl(url) || !url) return
    const path = pathFromUrl(url)
    if (!path) return
    const { error } = await supabase.storage.from(SESSION_IMAGES_BUCKET).remove([path])
    if (error) {
      console.warn('No se pudo eliminar la imagen del bucket:', error.message)
    }
  }

  return {
    uploadSessionImage,
    deleteSessionImageByUrl,
    isStoredImageUrl,
    getPublicUrl,
    pathFromUrl
  }
}

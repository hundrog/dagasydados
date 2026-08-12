const AVATARS_BUCKET = 'master-avatars'
const AVATARS_MARKER = `/storage/v1/object/public/${AVATARS_BUCKET}/`

const fileExtension = (name: string): string => {
  const ext = name.split('.').pop()
  return ext && ext.length > 0 && ext.length <= 10 ? `.${ext}` : ''
}

export function useMasterAvatar() {
  const supabase = useSupabaseClient()
  const supabaseUrl = useRuntimeConfig().public.supabaseUrl

  const isStoredAvatarUrl = (url: string | null | undefined): boolean => {
    if (!url || !supabaseUrl) return false
    return url.includes(`${supabaseUrl}${AVATARS_MARKER}`)
  }

  const pathFromUrl = (url: string): string | null => {
    const index = url.indexOf(AVATARS_MARKER)
    if (index === -1) return null
    return url.slice(index + AVATARS_MARKER.length)
  }

  const getPublicUrl = (path: string): string => {
    const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  const uploadMasterAvatar = async (file: File): Promise<string> => {
    const path = `${crypto.randomUUID()}${fileExtension(file.name)}`
    const { error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined
      })
    if (error) throw error
    return getPublicUrl(path)
  }

  const deleteMasterAvatarByUrl = async (url: string | null | undefined): Promise<void> => {
    if (!isStoredAvatarUrl(url) || !url) return
    const path = pathFromUrl(url)
    if (!path) return
    const { error } = await supabase.storage.from(AVATARS_BUCKET).remove([path])
    if (error) {
      console.warn('No se pudo eliminar el avatar del bucket:', error.message)
    }
  }

  return {
    uploadMasterAvatar,
    deleteMasterAvatarByUrl,
    isStoredAvatarUrl,
    getPublicUrl,
    pathFromUrl
  }
}

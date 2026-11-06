export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return

  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/login')
  }

  const profileStore = useCurrentProfileStore()
  await profileStore.refresh()

  const profile = profileStore.master
  const isMaster = profile?.role === 'master' || profile?.status === 'authorized'

  if (!isMaster && !profileStore.isLoading) {
    return navigateTo('/cuenta')
  }
})

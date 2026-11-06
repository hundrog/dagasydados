<script setup lang="ts">
const supabase = useSupabaseClient()
const toast = useToast()
const user = useSupabaseUser()
const profileStore = useCurrentProfileStore()

const fullName = ref('')
const userName = ref('')
const avatarUrl = ref('')
const isSaving = ref(false)

watch(
  () => profileStore.master,
  (m) => {
    if (!m) return
    fullName.value = m.full_name ?? ''
    userName.value = m.user_name ?? ''
    avatarUrl.value = m.avatar_url ?? ''
  },
  { immediate: true }
)

async function saveIdentity() {
  if (!user.value?.sub) return
  isSaving.value = true

  const { error } = await supabase
    .from('dagger_masters')
    .update({
      full_name: fullName.value.trim() || null,
      user_name: userName.value.trim() || null,
      avatar_url: avatarUrl.value.trim() || null
    })
    .eq('id', user.value.sub)

  isSaving.value = false

  if (error) {
    toast.add({ title: 'Error', description: error.message, color: 'error' })
    return
  }

  await profileStore.refresh()
  toast.add({ title: 'Perfil actualizado', color: 'success', icon: 'i-lucide-circle-check' })
}

async function requestMaster() {
  if (!user.value?.sub) return

  const { error } = await supabase.rpc('request_master_authorization')

  if (error) {
    toast.add({ title: 'Error', description: error.message, color: 'error' })
    return
  }

  await profileStore.refresh()
  toast.add({ title: 'Solicitud enviada', color: 'success', icon: 'i-lucide-circle-check' })
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-8 p-4">
    <h1 class="text-2xl font-bold text-primary-900">Mi cuenta</h1>

    <div v-if="profileStore.isLoading">
      Cargando...
    </div>

    <div v-else class="space-y-6">
      <div class="flex items-center gap-4">
        <UAvatar :src="avatarUrl || undefined" :text="profileStore.master?.full_name?.charAt(0) ?? 'P'" size="xl" />
        <div>
          <p class="font-semibold text-primary-900">{{ profileStore.master?.full_name || 'Sin nombre' }}</p>
          <p class="text-sm text-slate-500">Estado: {{ profileStore.master?.status }}</p>
          <p class="text-sm text-slate-500">Rol: {{ profileStore.master?.role }}</p>
        </div>
      </div>

      <UForm class="space-y-4" @submit="saveIdentity">
        <UFormField label="Nombre" name="full_name">
          <UInput v-model="fullName" class="w-full" />
        </UFormField>
        <UFormField label="Usuario" name="user_name">
          <UInput v-model="userName" class="w-full" />
        </UFormField>
        <UFormField label="Avatar URL" name="avatar_url">
          <UInput v-model="avatarUrl" class="w-full" />
        </UFormField>
        <UButton type="submit" label="Guardar" :loading="isSaving" class="cursor-pointer" />
      </UForm>

      <div v-if="profileStore.canRequestMaster" class="pt-4 border-t border-slate-200">
        <p class="text-sm text-slate-600 mb-2">Puedes solicitar autorización para ser master.</p>
        <UButton
          label="Solicitar ser master"
          icon="i-lucide-shield-check"
          class="cursor-pointer"
          @click="requestMaster"
        />
      </div>

      <div v-else-if="profileStore.master?.status === 'pending'" class="text-sm text-amber-600">
        Tu solicitud para ser master está pendiente de aprobación.
      </div>
    </div>
  </div>
</template>

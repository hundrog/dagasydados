<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const supabase = useSupabaseClient()

type Master = {
  id: string
  full_name: string | null
  user_name: string | null
  phone: string | null
  avatar_url: string | null
}

const masters = ref<Master[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const getInitials = (value: string | null) => {
  if (!value) return 'M'

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'M'
}

const loadMasters = async () => {
  isLoading.value = true
  errorMessage.value = null

  const { data, error } = await supabase
    .from('dagger_masters')
    .select('id,full_name,user_name,phone,avatar_url')

  if (error) {
    errorMessage.value = error.message
  } else {
    masters.value = (data ?? []) as Master[]
  }

  isLoading.value = false
}

onMounted(() => {
  loadMasters()
})

const columns: TableColumn<Master>[] = [
  {
    accessorKey: 'full_name',
    header: 'Nombre',
    cell: ({ row }) => row.original.full_name || '-'
  },
  {
    accessorKey: 'user_name',
    header: 'Apodo',
    cell: ({ row }) => row.original.user_name || '-'
  },
  {
    accessorKey: 'phone',
    header: 'Teléfono',
    cell: ({ row }) => row.original.phone || '-'
  },
  {
    id: 'avatar',
    header: 'Avatar',
    cell: ({ row }) => {
      const avatarUrl = row.original.avatar_url
      const displayName = row.original.full_name || row.original.user_name || 'Master'
      const initials = getInitials(displayName)

      return h('div', { class: 'flex items-center justify-center' }, [
        avatarUrl
          ? h('img', {
              src: avatarUrl,
              alt: displayName,
              class: 'h-10 w-10 rounded-full object-cover border border-slate-200'
            })
          : h('div', {
              class: 'flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600'
            }, initials)
      ])
    }
  }
]
</script>
<template>
  <div class="flex-1 mt-12">
    <div class="flex justify-end my-8">
      <AdminMasterForm @created="loadMasters" />
    </div>

    <div v-if="isLoading" class="p-4 text-sm text-slate-500">Cargando masters...</div>
    <div v-else-if="errorMessage" class="p-4 text-sm text-red-600">{{ errorMessage }}</div>
    <UTable v-else :data="masters" :columns="columns" class="flex-1" />
  </div>
</template>
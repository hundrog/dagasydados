<script setup lang="ts">
import { onMounted, ref, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const UTable = resolveComponent('UTable')

const supabase = useSupabaseClient()

type GameSession = {
  id: string
  title: string
  system: string | null
  session_type: string | null
  fecha_inicio: string
  hora_inicio: string | null
  hora_fin: string | null
}

const sessions = ref<GameSession[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

onMounted(async () => {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('id,title,system,session_type,fecha_inicio,hora_inicio,hora_fin')

  if (error) {
    errorMessage.value = error.message
  } else {
    sessions.value = (data ?? []) as GameSession[]
  }

  isLoading.value = false
})

const columns: TableColumn<GameSession>[] = [
  {
    accessorKey: 'title',
    header: 'Title'
  },
  {
    accessorKey: 'system',
    header: 'System'
  },
  {
    accessorKey: 'session_type',
    header: 'Session Type'
  },
  {
    accessorKey: 'fecha_inicio',
    header: 'Fecha inicio',
    cell: ({ row }) => {
      const value = row.getValue('fecha_inicio') as string | null
      if (!value) return '-'
      return new Date(value).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  },
  {
    id: 'horario',
    header: 'Horario',
    cell: ({ row }) => {
      const start = row.original.hora_inicio
      const end = row.original.hora_fin || ''
      const formatTime = (time: string) => {
        const parsed = new Date(time)
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
        const fallback = time.slice(0, 5)
        return fallback || time
      }

      if (!start && !end) return '-'
      if (!start) return formatTime(end)
      if (!end) return formatTime(start)
      return `${formatTime(start)} - ${formatTime(end)}`
    }
  }
]
</script>

<template>
  <div class="flex-1 mt-12">
    <div class="justify-end flex my-8">
      <UButton label="Nueva Sesión" icon="i-heroicons-plus" />
    </div>
    <div v-if="isLoading" class="p-4 text-sm text-slate-500">Cargando sesiones...</div>
    <div v-else-if="errorMessage" class="p-4 text-sm text-red-600">{{ errorMessage }}</div>
    <UTable v-else :data="sessions" :columns="columns" class="flex-1" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const supabase = useSupabaseClient()

const { data: event, error } = await supabase
  .from('events')
  .select('id, slug')
  .eq('short_code', String(route.params.code))
  .maybeSingle()

if (error || !event) {
  throw createError({ statusCode: 404, message: 'Evento no encontrado' })
}

await navigateTo({
  path: `/events/${event.slug ?? event.id}`
})
</script>

<template>
  <div class="p-4 text-sm text-slate-500">
    Redirigiendo al evento...
  </div>
</template>

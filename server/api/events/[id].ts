import type { Event, EventUpdate } from '~/types/event'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const method = event.method
  const id = getRouterParam(event, 'id')

  if (!id) throw createError({ statusCode: 400, message: 'Falta el id' })

  const supabase = await serverSupabaseClient(event)

  if (method === 'GET') {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw createError({ statusCode: 404, message: error.message })
    return data as Event
  }

  if (method === 'PUT') {
    const body = await readBody<EventUpdate>(event)
    const { data, error } = await supabase
      .from('events')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw createError({ statusCode: 500, message: error.message })
    return data as Event
  }

  if (method === 'DELETE') {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    if (error) throw createError({ statusCode: 500, message: error.message })
    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})

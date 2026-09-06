import type { Event, EventInsert } from '~/types/event'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const method = event.method

  if (method === 'GET') {
    const supabase = await serverSupabaseClient(event)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('fecha_inicio', { ascending: false })
    if (error) throw createError({ statusCode: 500, message: error.message })
    return data as Event[]
  }

  if (method === 'POST') {
    const supabase = await serverSupabaseClient(event)
    const body = await readBody<EventInsert>(event)
    const { data, error } = await supabase
      .from('events')
      .insert(body)
      .select()
      .single()
    if (error) throw createError({ statusCode: 500, message: error.message })
    return data as Event
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})

import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  nombre: z.string().min(1).max(80),
  telefono: z.string().min(1).max(20)
})

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000
const rateLimitHits = new Map<string, { count: number, resetAt: number }>()

const sanitizeName = (value: string) =>
  value.replace(/[^\p{L}\p{N}\s\-_.]/gu, '').trim().slice(0, 80)

const sanitizePhone = (value: string) =>
  value.replace(/[^\d+\s-]/g, '').trim().slice(0, 20)

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const now = Date.now()

  if (rateLimitHits.size > 10_000) {
    for (const [key, entry] of rateLimitHits) {
      if (entry.resetAt < now) rateLimitHits.delete(key)
    }
  }

  const current = rateLimitHits.get(ip)
  if (current && current.resetAt > now) {
    if (current.count >= RATE_LIMIT_MAX) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        message: 'Demasiadas reservas. Intenta de nuevo en un momento.'
      })
    }
    current.count += 1
  } else {
    rateLimitHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  }

  const body = await readBody(event).catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Datos de reserva inválidos' })
  }

  const nombre = sanitizeName(parsed.data.nombre)
  const telefono = sanitizePhone(parsed.data.telefono)
  if (!nombre || !telefono) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Nombre o teléfono inválidos' })
  }

  const supabase = await serverSupabaseClient(event)

  type SessionRow = { id: string, max_players: number | null }
  const { data } = await supabase
    .from('game_sessions')
    .select('id, max_players')
    .eq('id', parsed.data.sessionId)
    .maybeSingle()

  const session = data as SessionRow | null
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Sesión no encontrada' })
  }

  if (session.max_players != null) {
    const { count } = await supabase
      .from('session_players')
      .select('id', { count: 'exact', head: true })
      .eq('game_session_id', session.id)

    if (count != null && count >= session.max_players) {
      throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Esta sesión ya está llena' })
    }
  }

  const { error } = await supabase
    .from('session_players')
    .insert({ game_session_id: session.id, nombre, telefono })

  if (error) {
    if (error.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Este teléfono ya está registrado para esta sesión' })
    }
    if (error.code === '23514') {
      throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Esta sesión ya está llena' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error', message: 'No se pudo registrar la reserva' })
  }

  return { ok: true }
})

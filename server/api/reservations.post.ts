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

type CreatePlayerResult
  = { ok: true, id: string }
    | { ok: false, error: string, message: string }

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

  type SessionRow = { id: string }
  const { data } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('id', parsed.data.sessionId)
    .maybeSingle()

  const session = data as SessionRow | null
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Sesión no encontrada' })
  }

  const { data: result, error } = await supabase
    .rpc('create_session_player', {
      p_game_session_id: parsed.data.sessionId,
      p_nombre: nombre,
      p_telefono: telefono
    })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error', message: 'No se pudo registrar la reserva' })
  }

  const outcome = result as unknown as CreatePlayerResult
  if (!outcome.ok) {
    switch (outcome.error) {
      case 'duplicate':
        throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Este teléfono ya está registrado para esta sesión' })
      case 'full':
        throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Esta sesión ya está llena' })
      default:
        throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: outcome.message ?? 'Datos de reserva inválidos' })
    }
  }

  return { ok: true }
})

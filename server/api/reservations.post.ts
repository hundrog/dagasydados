import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  nombre: z.string().min(1).max(80),
  telefono: z.string().min(1).max(20)
})

type CreatePlayerResult
  = { ok: true, id: string }
    | { ok: false, error: string, message: string }

export default defineEventHandler(async (event) => {
  useRateLimit(event, {
    max: 5,
    windowMs: 60_000,
    message: 'Demasiadas reservas. Intenta de nuevo en un momento.'
  })

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

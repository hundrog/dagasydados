import type { H3Event } from 'h3'

type RateLimitOptions = {
  max: number
  windowMs: number
  message?: string
}

const hits = new Map<string, { count: number, resetAt: number }>()

export function useRateLimit(event: H3Event, options: RateLimitOptions): void {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const now = Date.now()

  if (hits.size > 10_000) {
    for (const [key, entry] of hits) {
      if (entry.resetAt < now) hits.delete(key)
    }
  }

  const current = hits.get(ip)
  if (current && current.resetAt > now) {
    if (current.count >= options.max) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        message: options.message ?? 'Demasiadas solicitudes. Intenta de nuevo en un momento.'
      })
    }
    current.count += 1
  } else {
    hits.set(ip, { count: 1, resetAt: now + options.windowMs })
  }
}

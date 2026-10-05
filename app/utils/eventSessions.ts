import type { Event } from '~/types/event'
import type { GameSessionWithMaster } from '~/types/session'
import { parseLocalDate } from '~/utils/date'

export const hasDedicatedSection = (session: GameSessionWithMaster): boolean =>
  Boolean(session.event?.highlight_sessions)

export const isEventUpcoming = (event: Pick<Event, 'fecha_fin'>, today: Date = new Date()): boolean => {
  const end = parseLocalDate(event.fecha_fin)
  if (!end) return false

  const from = new Date(today)
  from.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  return end.getTime() >= from.getTime()
}

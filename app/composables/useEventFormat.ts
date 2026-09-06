import type { Event } from '~/types/event'
import { parseLocalDate } from '~/utils/date'

const formatDate = (date: Date) => date.toLocaleDateString('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric'
})

const formatHour = (time: string | null | undefined) => {
  if (!time) return ''
  const [hoursStr, minutesStr] = time.slice(0, 5).split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  const date = new Date()
  date.setHours(Number.isNaN(hours) ? 0 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0)
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export const formatEventRange = (event: Pick<Event, 'fecha_inicio' | 'fecha_fin' | 'hora_inicio' | 'hora_fin'>): string => {
  const start = parseLocalDate(event.fecha_inicio)
  const end = parseLocalDate(event.fecha_fin)

  if (!start || !end) return ''

  const startHour = formatHour(event.hora_inicio)
  const endHour = formatHour(event.hora_fin)

  const sameDay = start.toDateString() === end.toDateString()
  const date = formatDate(start)

  if (sameDay) {
    if (startHour && endHour) return `${date} · ${startHour} - ${endHour}`
    if (startHour) return `${date} · ${startHour}`
    return date
  }

  const endDate = formatDate(end)
  return `${date} - ${endDate}`
}

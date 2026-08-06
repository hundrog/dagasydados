import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { RRule, rrulestr } from 'rrule'
import type { GameSessionWithMaster } from '~/types/session'

export const parseSessionRule = (raw: string, fallbackDtstart: Date): RRule | null => {
  try {
    if (raw.startsWith('DTSTART:')) {
      const normalized = raw.includes('\nRRULE:') ? raw : raw.replace('RRULE:', '\nRRULE:')
      const rule = rrulestr(normalized)
      return rule instanceof RRule ? rule : null
    }
    if (raw.startsWith('RRULE:')) {
      const rule = rrulestr(raw, { dtstart: fallbackDtstart })
      return rule instanceof RRule ? rule : null
    }
    const rule = rrulestr(`RRULE:${raw}`, { dtstart: fallbackDtstart })
    return rule instanceof RRule ? rule : null
  } catch {
    return null
  }
}

export const useSessionFormat = (sessionRef: MaybeRefOrGetter<GameSessionWithMaster | null>) => {
  const session = computed(() => toValue(sessionRef))

  const formatDate = (value: string | Date | null) => {
    if (!value) return ''
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return value instanceof Date ? '' : value
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (value: string | null) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    }
    return value.slice(0, 5)
  }

  const parseRule = (raw: string, fallbackDtstart: Date): RRule | null =>
    parseSessionRule(raw, fallbackDtstart)

  const weekdayLabel = computed(() => {
    if (!session.value?.fecha_inicio) return ''
    const date = new Date(session.value.fecha_inicio)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase()
  })

  const recurrence = computed(() => {
    const raw = session.value?.rrule
    if (!raw || !session.value?.fecha_inicio) return null
    const dtstart = new Date(session.value.fecha_inicio)
    if (Number.isNaN(dtstart.getTime())) return null
    const rule = parseRule(raw, dtstart)
    if (!rule) return null
    try {
      const bounded = typeof rule.origOptions.count === 'number' || rule.origOptions.until != null
      if (!bounded) return null
      const occurrences = rule.all()
      const first = occurrences[0]
      const last = occurrences[occurrences.length - 1]
      if (occurrences.length < 2 || !first || !last) return null
      return {
        start: first,
        end: last,
        count: occurrences.length
      }
    } catch {
      return null
    }
  })

  const recurrenceLabel = computed(() => {
    if (!recurrence.value) return ''
    return `${formatDate(recurrence.value.start)} a ${formatDate(recurrence.value.end)} · ${recurrence.value.count} sesiones`
  })

  const scheduleLabel = computed(() => {
    const start = formatTime(session.value?.hora_inicio ?? null)
    const end = formatTime(session.value?.hora_fin ?? null)
    const timeRange = `${start}${end ? ` - ${end}` : ''}`
    const date = formatDate(session.value?.fecha_inicio ?? null)
    const weekday = weekdayLabel.value

    if (recurrence.value) {
      if (weekday && timeRange) return `${weekday} ${timeRange}`
      if (weekday) return weekday
      if (timeRange) return timeRange
      return date
    }
    if (date && timeRange) return `${date} · ${timeRange}`
    if (date) return date
    return timeRange
  })

  const currentPlayers = computed(() => session.value?.session_players?.[0]?.count ?? 0)

  const modeColor = computed(() => {
    switch (session.value?.mode) {
      case 'online':
        return 'bg-success/10 text-success'
      case 'offline':
        return 'bg-error/10 text-error'
      case 'hybrid':
        return 'bg-primary/10 text-primary'
      default:
        return 'bg-surface-variant/10 text-on-surface-variant'
    }
  })

  const modeIcon = computed(() => {
    switch (session.value?.mode) {
      case 'online':
        return 'i-lucide-wifi'
      case 'offline':
        return 'i-lucide-map-pin'
      case 'hybrid':
        return 'i-lucide-wifi'
      default:
        return 'i-lucide-help-circle'
    }
  })

  const modeLabel = computed(() => {
    switch (session.value?.mode) {
      case 'online':
        return 'Online'
      case 'offline':
        return 'Presencial'
      case 'hybrid':
        return 'Híbrido'
      default:
        return 'Desconocido'
    }
  })

  return {
    formatDate,
    formatTime,
    weekdayLabel,
    recurrence,
    recurrenceLabel,
    scheduleLabel,
    currentPlayers,
    modeColor,
    modeIcon,
    modeLabel
  }
}

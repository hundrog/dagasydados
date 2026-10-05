import { describe, it, expect } from 'vitest'
import { hasDedicatedSection, isEventUpcoming } from '../eventSessions'
import { localDateValue } from '../date'
import type { GameSessionWithMaster } from '~/types/session'

const session = (event: GameSessionWithMaster['event']): GameSessionWithMaster =>
  ({ id: 'session-1', event } as GameSessionWithMaster)

const event = (highlight: boolean): NonNullable<GameSessionWithMaster['event']> => ({
  id: 'event-1',
  name: 'Convento de Rol 2026',
  slug: 'convento-de-rol-2026',
  description: null,
  fecha_inicio: '2026-09-06',
  fecha_fin: '2026-09-06',
  hora_inicio: null,
  hora_fin: null,
  zona_horaria: null,
  image_url: null,
  highlight_sessions: highlight
})

describe('hasDedicatedSection', () => {
  it('devuelve false si la sesión no pertenece a un evento', () => {
    expect(hasDedicatedSection(session(null))).toBe(false)
  })

  it('devuelve true si el evento tiene las sesiones destacadas', () => {
    expect(hasDedicatedSection(session(event(true)))).toBe(true)
  })

  it('devuelve false si el evento mezcla sus sesiones con las demás', () => {
    expect(hasDedicatedSection(session(event(false)))).toBe(false)
  })
})

describe('isEventUpcoming', () => {
  it('devuelve true si el evento termina en una fecha futura', () => {
    expect(isEventUpcoming({ fecha_fin: '2099-01-15' })).toBe(true)
  })

  it('devuelve true si el evento termina hoy', () => {
    expect(isEventUpcoming({ fecha_fin: localDateValue() })).toBe(true)
  })

  it('devuelve false si el evento ya terminó', () => {
    expect(isEventUpcoming({ fecha_fin: '2020-01-15' })).toBe(false)
  })

  it('devuelve false si la fecha de fin es inválida', () => {
    expect(isEventUpcoming({ fecha_fin: 'no-es-fecha' })).toBe(false)
  })

  it('compara contra el día indicado, no contra la hora actual', () => {
    expect(isEventUpcoming({ fecha_fin: '2026-06-10' }, new Date(2026, 5, 10, 23, 30))).toBe(true)
    expect(isEventUpcoming({ fecha_fin: '2026-06-09' }, new Date(2026, 5, 10, 0, 15))).toBe(false)
  })
})

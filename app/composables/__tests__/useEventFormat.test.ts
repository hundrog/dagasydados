import { describe, it, expect } from 'vitest'
import { formatEventRange } from '../useEventFormat'

const event = (overrides: Partial<{
  fecha_inicio: string
  fecha_fin: string
  hora_inicio: string | null
  hora_fin: string | null
}> = {}) => ({
  fecha_inicio: '2026-09-06',
  fecha_fin: '2026-09-06',
  hora_inicio: '09:00',
  hora_fin: '14:00',
  ...overrides
})

describe('formatEventRange', () => {
  it('formatea un evento del mismo día con horas de inicio y fin', () => {
    expect(formatEventRange(event())).toBe('06 de septiembre de 2026 · 09:00 - 14:00')
  })

  it('formatea un evento con solo hora de inicio', () => {
    expect(formatEventRange(event({ hora_fin: null }))).toBe('06 de septiembre de 2026 · 09:00')
  })

  it('formatea un evento del mismo día sin horas', () => {
    expect(formatEventRange(event({ hora_inicio: null, hora_fin: null }))).toBe('06 de septiembre de 2026')
  })

  it('formatea un evento de varios días', () => {
    expect(formatEventRange(event({ fecha_fin: '2026-09-08' }))).toBe('06 de septiembre de 2026 - 08 de septiembre de 2026')
  })

  it('recorta segundos de las horas', () => {
    expect(formatEventRange(event({ hora_inicio: '09:00:00', hora_fin: '14:00:00' }))).toBe('06 de septiembre de 2026 · 09:00 - 14:00')
  })

  it('devuelve string vacío si las fechas son inválidas', () => {
    expect(formatEventRange(event({ fecha_inicio: 'invalid' }))).toBe('')
    expect(formatEventRange(event({ fecha_fin: '' }))).toBe('')
  })

  it('ignora la hora de fin si no hay hora de inicio', () => {
    expect(formatEventRange(event({ hora_inicio: null, hora_fin: '14:00' }))).toBe('06 de septiembre de 2026')
  })

  it('normaliza horas con formato incompleto', () => {
    expect(formatEventRange(event({ hora_fin: '14' }))).toBe('06 de septiembre de 2026 · 09:00 - 14:00')
  })
})

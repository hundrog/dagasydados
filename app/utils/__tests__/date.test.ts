import { describe, it, expect } from 'vitest'
import { formatDateEsUtc, parseLocalDate } from '../date'

describe('parseLocalDate', () => {
  it('devuelve null para valores vacíos', () => {
    expect(parseLocalDate(null)).toBeNull()
    expect(parseLocalDate(undefined)).toBeNull()
    expect(parseLocalDate('')).toBeNull()
  })

  it('devuelve null para cadenas inválidas', () => {
    expect(parseLocalDate('not-a-date')).toBeNull()
    expect(parseLocalDate('30-02-2026')).toBeNull()
    expect(parseLocalDate('2026/09/06Taa')).toBeNull()
  })

  it('parsa una fecha YYYY-MM-DD como fecha local', () => {
    const date = parseLocalDate('2026-09-06')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026)
    expect(date!.getMonth()).toBe(8)
    expect(date!.getDate()).toBe(6)
  })

  it('parsa un timestamp ISO con hora', () => {
    const date = parseLocalDate('2026-09-06T15:30:00.000Z')
    expect(date).not.toBeNull()
    expect(date!.getTime()).toBe(new Date('2026-09-06T15:30:00.000Z').getTime())
  })

  it('devuelve el mismo Date si recibe un objeto Date válido', () => {
    const input = new Date(2026, 8, 6)
    const result = parseLocalDate(input)
    expect(result).toBe(input)
  })

  it('devuelve null si recibe un objeto Date inválido', () => {
    expect(parseLocalDate(new Date('invalid'))).toBeNull()
  })
})

describe('formatDateEsUtc', () => {
  it('formatea en español usando UTC', () => {
    expect(formatDateEsUtc('2026-11-06T05:30:00.000Z')).toBe('6 de noviembre de 2026')
    expect(formatDateEsUtc('2026-01-01T00:00:00.000Z')).toBe('1 de enero de 2026')
  })

  it('usa el día UTC aunque en otra zona ya sea otro día', () => {
    expect(formatDateEsUtc('2026-11-06T23:30:00.000Z')).toBe('6 de noviembre de 2026')
  })

  it('acepta objetos Date', () => {
    expect(formatDateEsUtc(new Date('2026-08-31T12:00:00.000Z'))).toBe('31 de agosto de 2026')
  })

  it('devuelve cadena vacía para valores vacíos o inválidos', () => {
    expect(formatDateEsUtc(null)).toBe('')
    expect(formatDateEsUtc(undefined)).toBe('')
    expect(formatDateEsUtc('')).toBe('')
    expect(formatDateEsUtc('not-a-date')).toBe('')
    expect(formatDateEsUtc(new Date('invalid'))).toBe('')
  })
})

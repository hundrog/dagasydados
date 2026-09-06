import { describe, it, expect } from 'vitest'
import { parseLocalDate } from '../date'

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

import { describe, it, expect } from 'vitest'
import { sanitizeName, sanitizePhone } from '../sanitize'

describe('sanitizeName', () => {
  it('deja pasar un nombre limpio sin modificarlo', () => {
    expect(sanitizeName('Juan Pérez')).toBe('Juan Pérez')
  })

  it('recorta espacios al inicio y al final', () => {
    expect(sanitizeName('  María  ')).toBe('María')
  })

  it('elimina caracteres potencialmente peligrosos (;, <, >)', () => {
    expect(sanitizeName('Carlos; DROP TABLE')).toBe('Carlos DROP TABLE')
    expect(sanitizeName('<script>alert(1)</script>')).toBe('scriptalert1script')
  })

  it('permite guiones, underscores y números', () => {
    expect(sanitizeName('Ana-Lucía_123')).toBe('Ana-Lucía_123')
  })

  it('permite caracteres unicode no-latinos', () => {
    expect(sanitizeName('名前テスト')).toBe('名前テスト')
  })

  it('trunca a 80 caracteres', () => {
    const input = 'a'.repeat(100)
    expect(sanitizeName(input)).toBe('a'.repeat(80))
    expect(sanitizeName(input)).toHaveLength(80)
  })

  it('conserva espacios internos tras recortar los bordes', () => {
    expect(sanitizeName('  Juan  Pérez  ')).toBe('Juan  Pérez')
  })

  it('elimina caracteres de control no-whitespace', () => {
    expect(sanitizeName('Hello\x00World')).toBe('HelloWorld')
    expect(sanitizeName('a\x1bb')).toBe('ab')
  })

  it('elimina caracteres como @ y #', () => {
    expect(sanitizeName('Test@email.com')).toBe('Testemail.com')
  })

  it('devuelve string vacío para input vacío', () => {
    expect(sanitizeName('')).toBe('')
  })
})

describe('sanitizePhone', () => {
  it('deja pasar un teléfono con formato válido', () => {
    expect(sanitizePhone('+52 55 1234-5678')).toBe('+52 55 1234-5678')
  })

  it('deja pasar un teléfono con solo dígitos', () => {
    expect(sanitizePhone('5551234567')).toBe('5551234567')
  })

  it('elimina letras', () => {
    expect(sanitizePhone('abc123')).toBe('123')
  })

  it('elimina paréntesis y otros símbolos', () => {
    expect(sanitizePhone('+52 (55) 1234-5678')).toBe('+52 55 1234-5678')
  })

  it('elimina puntos y comas', () => {
    expect(sanitizePhone('55.1234,5678')).toBe('5512345678')
  })

  it('trunca a 20 caracteres', () => {
    const input = '1'.repeat(25)
    expect(sanitizePhone(input)).toBe('1'.repeat(20))
    expect(sanitizePhone(input)).toHaveLength(20)
  })

  it('recorta espacios al inicio y al final', () => {
    expect(sanitizePhone('  555  ')).toBe('555')
  })

  it('devuelve string vacío para input de solo espacios', () => {
    expect(sanitizePhone('   ')).toBe('')
  })

  it('devuelve string vacío para input vacío', () => {
    expect(sanitizePhone('')).toBe('')
  })
})

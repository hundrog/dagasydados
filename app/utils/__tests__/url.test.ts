import { describe, it, expect } from 'vitest'
import {
  slugify,
  generateSlug,
  generateShortCode,
  ensureUniqueSlug,
  ensureUniqueShortCode,
  SLUG_MAX_LENGTH
} from '../url'

describe('slugify', () => {
  it('convierte a minúsculas y reemplaza espacios con guiones', () => {
    expect(slugify('Convento de Rol 2026')).toBe('convento-de-rol-2026')
  })

  it('elimina acentos', () => {
    expect(slugify('Agregémosle Ángulos')).toBe('agregemosle-angulos')
  })

  it('elimina caracteres especiales', () => {
    expect(slugify('D&D: La Torre!')).toBe('dd-la-torre')
  })

  it('colapsa espacios y guiones consecutivos', () => {
    expect(slugify('  doble--espacio  con espacios ')).toBe('doble-espacio-con-espacios')
  })

  it('quita guiones al inicio y al final', () => {
    expect(slugify('-Evento Genial-')).toBe('evento-genial')
  })

  it('devuelve cadena vacía para entradas sin caracteres válidos', () => {
    expect(slugify('!!!')).toBe('')
  })

  it('trunca a SLUG_MAX_LENGTH caracteres', () => {
    const long = 'un-evento-con-un-nombre-extremadamente-largo-para-probar-el-limite-de-longitud-del-slug'
    expect(slugify(long).length).toBeLessThanOrEqual(SLUG_MAX_LENGTH)
    expect(slugify(long).length).toBe(SLUG_MAX_LENGTH)
  })
})

describe('generateSlug', () => {
  it('sluguifica un nombre válido', () => {
    expect(generateSlug('Convento de Rol 2026')).toBe('convento-de-rol-2026')
  })

  it('genera un slug con prefijo evento- cuando el nombre no es válido', () => {
    const slug = generateSlug('!!!')
    expect(slug).toMatch(/^evento-[a-z0-9]{6}$/)
  })
})

describe('generateShortCode', () => {
  it('genera un código de 6 caracteres por defecto', () => {
    const code = generateShortCode()
    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[a-z0-9]{6}$/)
  })

  it('respeta una longitud personalizada', () => {
    for (const length of [1, 4, 8, 12]) {
      expect(generateShortCode(length)).toHaveLength(length)
    }
  })

  it('solo usa caracteres permitidos', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateShortCode()).toMatch(/^[a-z0-9]{6}$/)
    }
  })

  it('genera códigos distintos entre llamadas', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateShortCode()))
    expect(codes.size).toBe(200)
  })
})

describe('ensureUniqueSlug', () => {
  it('devuelve el slug si no está en uso', () => {
    expect(ensureUniqueSlug('convento-de-rol-2026', ['otro-slug'])).toBe('convento-de-rol-2026')
  })

  it('devuelve el slug sin cambios si la lista de usados está vacía', () => {
    expect(ensureUniqueSlug('convento-de-rol-2026', [])).toBe('convento-de-rol-2026')
  })

  it('agrega sufijo -2 cuando el slug ya está en uso', () => {
    expect(ensureUniqueSlug('convento-de-rol', ['convento-de-rol'])).toBe('convento-de-rol-2')
  })

  it('incrementa el sufijo ante múltiples colisiones', () => {
    const taken = ['convento', 'convento-2', 'convento-3']
    expect(ensureUniqueSlug('convento', taken)).toBe('convento-4')
  })

  it('no excede el límite de longitud al agregar sufijos', () => {
    const base = 'a'.repeat(SLUG_MAX_LENGTH - 2)
    const slug = ensureUniqueSlug(base, [base])
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH)
    expect(slug).toBe(`${base.slice(0, SLUG_MAX_LENGTH - 2)}-2`)
  })

  it('lanza error si no encuentra un slug libre tras muchos intentos', () => {
    const base = 'evt'
    const taken = ['evt', ...Array.from({ length: 10_002 }, (_, i) => `evt-${i + 2}`)]
    expect(() => ensureUniqueSlug(base, taken)).toThrow('No se pudo generar un slug único')
  })
})

describe('ensureUniqueShortCode', () => {
  it('genera un código que no está en la lista de usados', () => {
    const taken = Array.from({ length: 50 }, (_, i) => `code${i}`)
    const code = ensureUniqueShortCode(taken)
    expect(taken).not.toContain(code)
    expect(code).toHaveLength(6)
  })

  it('devuelve un código válido aunque la lista esté vacía', () => {
    const code = ensureUniqueShortCode([])
    expect(code).toMatch(/^[a-z0-9]{6}$/)
  })

  it('no repite códigos al generar muchos secuencialmente', () => {
    const taken = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const code = ensureUniqueShortCode([...taken])
      expect(taken.has(code)).toBe(false)
      taken.add(code)
    }
  })

  it('lanza error cuando no hay más combinaciones disponibles', () => {
    // Espacio de 1 carácter = 36 combinaciones
    const all = Array.from({ length: 36 }, (_, i) =>
      i < 10 ? String(i) : String.fromCharCode(97 + i - 10)
    )
    expect(() => ensureUniqueShortCode(all, 1)).toThrow('No hay más códigos cortos disponibles')
  })
})

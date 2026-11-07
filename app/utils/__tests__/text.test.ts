import { describe, expect, it } from 'vitest'
import { truncateText } from '../text'

describe('truncateText', () => {
  it('devuelve el texto normalizado si cabe', () => {
    expect(truncateText('  Hola   mundo  ', 20)).toBe('Hola mundo')
  })

  it('recorta en el último espacio y añade elipsis', () => {
    expect(truncateText('uno dos tres cuatro', 12)).toBe('uno dos…')
  })

  it('no supera la longitud máxima', () => {
    const result = truncateText('palabra '.repeat(40), 40)

    expect(result.length).toBeLessThanOrEqual(40)
    expect(result.endsWith('…')).toBe(true)
  })

  it('corta en seco si no hay espacios razonables', () => {
    expect(truncateText('a'.repeat(30), 10)).toBe(`${'a'.repeat(9)}…`)
  })

  it('devuelve cadena vacía sin contenido', () => {
    expect(truncateText('   ', 10)).toBe('')
  })
})

import { describe, it, expect } from 'vitest'
import { buildMonthOptions, currentMonthValue, monthRange } from '../months'

describe('currentMonthValue', () => {
  it('devuelve el mes con dos dígitos', () => {
    expect(currentMonthValue(new Date(2026, 0, 15))).toBe('2026-01')
    expect(currentMonthValue(new Date(2026, 8, 30))).toBe('2026-09')
    expect(currentMonthValue(new Date(2026, 11, 1))).toBe('2026-12')
  })
})

describe('monthRange', () => {
  it('devuelve null para valores que no son un mes', () => {
    expect(monthRange(null)).toBeNull()
    expect(monthRange(undefined)).toBeNull()
    expect(monthRange('')).toBeNull()
    expect(monthRange('all')).toBeNull()
    expect(monthRange('2026-9')).toBeNull()
    expect(monthRange('septiembre')).toBeNull()
  })

  it('empieza el primer día del mes a medianoche', () => {
    const range = monthRange('2026-09')!
    expect(range.start.getFullYear()).toBe(2026)
    expect(range.start.getMonth()).toBe(8)
    expect(range.start.getDate()).toBe(1)
    expect(range.start.getHours()).toBe(0)
    expect(range.start.getMinutes()).toBe(0)
  })

  it('termina el último día del mes al final del día', () => {
    const sept = monthRange('2026-09')!.end
    expect(sept.getDate()).toBe(30)
    expect(sept.getHours()).toBe(23)
    expect(sept.getMinutes()).toBe(59)
    expect(sept.getSeconds()).toBe(59)
    expect(sept.getMilliseconds()).toBe(999)
  })

  it('respeta la cantidad de días de cada mes', () => {
    expect(monthRange('2026-02')!.end.getDate()).toBe(28)
    expect(monthRange('2024-02')!.end.getDate()).toBe(29)
    expect(monthRange('2026-04')!.end.getDate()).toBe(30)
    expect(monthRange('2026-12')!.end.getDate()).toBe(31)
  })
})

describe('buildMonthOptions', () => {
  it('genera 7 meses por defecto arrancando en el mes actual', () => {
    const options = buildMonthOptions(7, new Date(2026, 8, 15))
    expect(options).toHaveLength(7)
    expect(options[0]!.value).toBe('2026-09')
    expect(options[6]!.value).toBe('2027-03')
  })

  it('respeta el número de meses solicitado', () => {
    expect(buildMonthOptions(1, new Date(2026, 8, 15))).toHaveLength(1)
    expect(buildMonthOptions(3, new Date(2026, 8, 15))).toHaveLength(3)
    expect(buildMonthOptions(0, new Date(2026, 8, 15))).toHaveLength(0)
  })

  it('cruza el cambio de año', () => {
    const options = buildMonthOptions(3, new Date(2026, 11, 20))
    expect(options.map(option => option.value)).toEqual(['2026-12', '2027-01', '2027-02'])
  })

  it('genera etiquetas en español capitalizadas', () => {
    const options = buildMonthOptions(1, new Date(2026, 8, 15))
    expect(options[0]!.label).toMatch(/^Septiembre/)
    expect(options[0]!.label).toContain('2026')
  })
})

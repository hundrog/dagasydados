export const parseLocalDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
] as const

/**
 * Formatea una fecha en español usando UTC.
 *
 * Evita `Intl`/`toLocaleDateString` a propósito: el SSR corre en Cloudflare
 * (locale y zona horaria distintas a las del navegador), así que el mismo
 * timestamp podía renderizar "11/6/2026" en el servidor y "6/11/2026" en el
 * cliente, provocando un hydration mismatch.
 */
export const formatDateEsUtc = (value: string | Date | null | undefined): string => {
  if (!value) return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return `${date.getUTCDate()} de ${MONTHS_ES[date.getUTCMonth()]} de ${date.getUTCFullYear()}`
}

export const localDateValue = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

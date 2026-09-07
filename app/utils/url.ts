export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function generateSlug(value: string, fallbackLength = 6): string {
  const slug = slugify(value)
  if (slug) return slug

  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < fallbackLength; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return `evento-${result}`
}

const SHORT_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function generateShortCode(length = 6): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += SHORT_CODE_CHARS[Math.floor(Math.random() * SHORT_CODE_CHARS.length)]
  }
  return result
}

export const SLUG_MAX_LENGTH = 80

export function ensureUniqueSlug(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base

  let suffix = 2
  let candidate = `${base.slice(0, SLUG_MAX_LENGTH - 2)}-${suffix}`
  while (taken.includes(candidate)) {
    suffix++
    candidate = `${base.slice(0, SLUG_MAX_LENGTH - 2)}-${suffix}`
    if (suffix > 10_000) {
      throw new Error('No se pudo generar un slug único')
    }
  }
  return candidate
}

export function ensureUniqueShortCode(taken: string[], length = 6): string {
  if (taken.length >= SHORT_CODE_CHARS.length ** length) {
    throw new Error('No hay más códigos cortos disponibles')
  }

  let code = generateShortCode(length)
  let attempts = 0
  while (taken.includes(code) && attempts < 1_000) {
    code = generateShortCode(length)
    attempts++
  }
  return code
}

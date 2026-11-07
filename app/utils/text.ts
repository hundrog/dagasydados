/**
 * Normaliza espacios y recorta un texto sin cortar palabras a la mitad.
 * Devuelve como máximo `maxLength` caracteres, incluyendo el carácter de
 * elipsis si hubo recorte.
 */
export function truncateText(value: string, maxLength = 160): string {
  const normalized = value.replace(/\s+/g, ' ').trim()

  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized

  const limit = Math.max(1, maxLength - 1)
  const cut = normalized.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')

  // Si el último espacio está muy atrás, preferimos cortar en seco antes que
  // dejar una frase casi entera fuera.
  const base = lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut

  return `${base.trimEnd()}…`
}

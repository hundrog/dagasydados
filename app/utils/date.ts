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

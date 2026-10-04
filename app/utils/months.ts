export type MonthOption = { label: string, value: string }
export type MonthRange = { start: Date, end: Date }

const MONTH_VALUE_PATTERN = /^\d{4}-\d{2}$/

export const currentMonthValue = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export const monthRange = (value: string | null | undefined): MonthRange | null => {
  if (!value || !MONTH_VALUE_PATTERN.test(value)) return null

  const [rawYear, rawMonth] = value.split('-')
  const year = Number(rawYear)
  const month = Number(rawMonth)

  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999)
  }
}

export const buildMonthOptions = (count = 7, from: Date = new Date()): MonthOption[] => {
  const options: MonthOption[] = []
  for (let offset = 0; offset < count; offset++) {
    const date = new Date(from.getFullYear(), from.getMonth() + offset, 1)
    const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    options.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value: currentMonthValue(date)
    })
  }
  return options
}

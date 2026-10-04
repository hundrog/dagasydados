import { computed, ref } from 'vue'
import { buildMonthOptions, currentMonthValue, monthRange, type MonthOption, type MonthRange } from '~/utils/months'

type MonthFilterOptions = {
  initial?: string
  count?: number
  allLabel?: string
}

export const useMonthFilter = ({ initial = currentMonthValue(), count = 7, allLabel = 'Todos los meses' }: MonthFilterOptions = {}) => {
  const selectedMonth = ref(initial)

  const monthOptions = computed<MonthOption[]>(() => [
    ...(initial === 'all' ? [{ label: allLabel, value: 'all' }] : []),
    ...buildMonthOptions(count)
  ])

  const resolveRange = (): MonthRange | null => monthRange(selectedMonth.value)

  const isDefault = () => selectedMonth.value === initial

  const reset = () => {
    selectedMonth.value = initial
  }

  return { selectedMonth, monthOptions, resolveRange, isDefault, reset }
}

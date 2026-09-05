<script setup lang="ts">
import { vMaska } from 'maska/vue'
import type { PhoneCode } from '~/types/phone'

const props = withDefaults(defineProps<{
  modelValue?: string
  name?: string
  label?: string
  hint?: string
  required?: boolean
  placeholder?: string
}>(), {
  modelValue: '',
  name: 'phone',
  label: 'Teléfono',
  hint: undefined,
  required: false,
  placeholder: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const countryCode = ref('MX')

const { data: phoneCodes, status, execute } = useLazyFetch<PhoneCode[]>('/api/phone-codes')

const country = computed(() => phoneCodes.value?.find(c => c.code === countryCode.value))
const dialCode = computed(() => country.value?.dialCode || '+52')
const mask = computed(() => country.value?.mask || '(##) #### ####')
const inputPlaceholder = computed(() => props.placeholder ?? mask.value.replaceAll('#', '_'))

const model = computed({
  get: () => props.modelValue ?? '',
  set: (value: string) => emit('update:modelValue', value)
})

let skipCountryWatch = false

watch(countryCode, () => {
  if (skipCountryWatch) {
    skipCountryWatch = false
    return
  }
  emit('update:modelValue', '')
})

function onOpen() {
  if (!phoneCodes.value?.length) {
    execute()
  }
}

const fullNumber = computed(() => {
  const digits = (props.modelValue ?? '').replace(/\D/g, '')
  if (!digits) return ''
  const mxPrefix = country.value?.code === 'MX' ? '1' : ''
  return `+${dialCode.value.replace(/\D/g, '')}${mxPrefix}${digits}`
})

const stripCountryCode = (digits: string, dialCodeToStrip: string) => {
  const d = dialCodeToStrip.replace(/\D/g, '')
  return d && digits.length > d.length && digits.startsWith(d) ? digits.slice(d.length) : digits
}

function hydrateFromFull(full: string) {
  const digits = full.replace(/\D/g, '')
  const match = (phoneCodes.value ?? []).find((c) => {
    const d = c.dialCode.replace(/\D/g, '')
    return d && digits.length > d.length && digits.startsWith(d)
  })
  const detected = match ?? { code: 'MX', dialCode: '+52' }
  skipCountryWatch = true
  countryCode.value = detected.code
  let local = stripCountryCode(digits, detected.dialCode)
  if (detected.code === 'MX' && local.startsWith('1')) {
    local = local.slice(1)
  }
  emit('update:modelValue', local)
  nextTick(() => {
    skipCountryWatch = false
  })
}

defineExpose({ fullNumber, hydrateFromFull })
</script>

<template>
  <UFormField
    :label="label"
    :name="name"
    :hint="hint"
    :required="required"
  >
    <UFieldGroup class="w-full">
      <USelectMenu
        v-model="countryCode"
        :items="phoneCodes"
        value-key="code"
        :search-input="{
          placeholder: 'Search country...',
          icon: 'i-lucide-search',
          loading: status === 'pending'
        }"
        :filter-fields="['name', 'code', 'dialCode']"
        :content="{ align: 'start' }"
        :ui="{
          base: 'pe-8',
          content: 'w-48',
          placeholder: 'hidden',
          trailingIcon: 'size-4'
        }"
        trailing-icon="i-lucide-chevrons-up-down"
        @update:open="onOpen"
      >
        <span class="size-5 flex items-center text-lg">
          {{ country?.emoji || '\u{1F1FA}\u{1F1F8}' }}
        </span>

        <template #item-leading="{ item }">
          <span class="size-5 flex items-center text-lg">
            {{ item.emoji }}
          </span>
        </template>

        <template #item-label="{ item }">
          {{ item.name }} ({{ item.dialCode }})
        </template>
      </USelectMenu>

      <UInput
        v-model="model"
        v-maska="mask"
        class="w-full"
        :placeholder="inputPlaceholder"
      >
        <template #leading>
          {{ dialCode }}
        </template>
      </UInput>
    </UFieldGroup>
  </UFormField>
</template>

export interface PhoneCode {
  name: string
  code: string
  emoji: string
  dialCode: string
  mask: string
}

export const formatFullPhoneNumber = (country: PhoneCode | undefined, digits: string) => {
  if (!digits) return null
  const cleanDigits = digits.replace(/\D/g, '')
  if (!cleanDigits) return null

  const dialCodeClean = country?.dialCode.replace(/\D/g, '') || ''
  const mobilePrefix = country?.code === 'MX' ? '1' : ''

  return `${dialCodeClean}${mobilePrefix}${cleanDigits}`
}

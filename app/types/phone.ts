export type PhoneCode = {
  name: string
  code: string
  emoji: string
  dialCode: string
  mask: string
}

export type PhoneInputExpose = {
  fullNumber: string
  hydrateFromFull: (full: string) => void
}

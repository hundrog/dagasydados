const phoneCodes = [
  {
    name: 'United States',
    code: 'US',
    dialCode: '+1',
    emoji: '🇺🇸',
    mask: '(###) ###-####'
  },
  {
    name: 'Mexico',
    code: 'MX',
    dialCode: '+52',
    emoji: '🇲🇽',
    mask: '(##) #### ####'
  },
  {
    name: 'Cuba',
    code: 'CU',
    dialCode: '+53',
    emoji: '🇨🇺',
    mask: '# ### ####'
  }
]

export default defineEventHandler(() => {
  return phoneCodes
})

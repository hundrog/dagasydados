export const sanitizeName = (value: string): string =>
  value.replace(/[^\p{L}\p{N}\s\-_.]/gu, '').trim().slice(0, 80)

export const sanitizePhone = (value: string): string =>
  value.replace(/[^\d+\s-]/g, '').trim().slice(0, 20)

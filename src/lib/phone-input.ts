/** Accept common Indian mobile formats without truncating an invalid number. */
export function normalizeIndianPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 14 && digits.startsWith('0091')) return digits.slice(4)
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

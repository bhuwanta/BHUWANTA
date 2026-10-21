import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max'

/** Accept common Indian mobile formats without truncating an invalid number. */
export function normalizeIndianPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 14 && digits.startsWith('0091')) return digits.slice(4)
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

export const enquiryPhoneCountries = [
  { country: 'IN', label: 'India', callingCode: '91' },
  { country: 'AE', label: 'UAE', callingCode: '971' },
  { country: 'SA', label: 'Saudi Arabia', callingCode: '966' },
  { country: 'QA', label: 'Qatar', callingCode: '974' },
  { country: 'OM', label: 'Oman', callingCode: '968' },
  { country: 'KW', label: 'Kuwait', callingCode: '965' },
] as const

export type EnquiryPhoneCountry = typeof enquiryPhoneCountries[number]['country']

function phoneText(value: string): string | null {
  const trimmed = value.trim()
  // Formatting is allowed; letters, extensions and embedded '+' signs are not.
  // Do not silently strip an invalid suffix or truncate an overlong number.
  if (!trimmed || !/^\+?[\d\s().-]+$/.test(trimmed)) return null
  return trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed
}

/** Parse the entire input with country metadata, retaining the calling code. */
export function parseContactPhone(value: string, country: CountryCode = 'IN') {
  const input = phoneText(value)
  if (!input) return null
  const phone = parsePhoneNumberFromString(input, { defaultCountry: country, extract: false })
  if (!phone?.isValid() || phone.ext) return null
  const type = phone.getType()
  if (type !== 'MOBILE' && type !== 'FIXED_LINE_OR_MOBILE') return null
  return {
    country: phone.country,
    e164: String(phone.number),
    // Preserve existing Indian lead identities; overseas numbers include +code.
    storageValue: phone.country === 'IN' ? String(phone.nationalNumber) : String(phone.number),
  }
}

/** Whole-number identity for legacy Indian records and international WhatsApp IDs. */
export function canonicalPhoneNumber(value: string): string | null {
  const input = phoneText(value)
  if (!input) return null
  const digits = input.replace(/\D/g, '')
  const indian = normalizeIndianPhoneInput(input)
  const candidate = input.startsWith('+')
    ? input
    : indian.length === 10
      ? `+91${indian}`
      : `+${digits}`
  const phone = parsePhoneNumberFromString(candidate, { extract: false })
  return phone?.isValid() && !phone.ext ? String(phone.number) : null
}

/** Exact database aliases, never a suffix match that can join different countries. */
export function phoneNumberStorageVariants(value: string): string[] {
  const canonical = canonicalPhoneNumber(value)
  if (!canonical) return []
  const variants = [value, value.trim(), canonical, canonical.slice(1)]
  if (canonical.startsWith('+91')) {
    const national = canonical.slice(3)
    variants.push(national, `0${national}`, `0091${national}`)
  }
  return [...new Set(variants)]
}

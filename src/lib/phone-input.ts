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

export const ALL_WA_REPORT_SLOTS = ['6', '9', '12', '15', '18', '21'] as const
export type WaReportSlot = typeof ALL_WA_REPORT_SLOTS[number]

/** Normalizes any Indian WhatsApp recipient phone into standard 91XXXXXXXXXX format. */
export function normalizeWaRecipientPhone(value: string): { valid: boolean; phone: string; nationalNumber: string; error?: string } {
  if (!value || typeof value !== 'string') {
    return { valid: false, phone: '', nationalNumber: '', error: 'Phone number is required' }
  }
  const digits = value.replace(/\D/g, '')
  if (!digits) {
    return { valid: false, phone: '', nationalNumber: '', error: 'Please enter a valid phone number' }
  }

  const national = normalizeIndianPhoneInput(value)
  if (national.length !== 10) {
    return { 
      valid: false, 
      phone: '', 
      nationalNumber: '', 
      error: `Phone number must be exactly 10 digits (received ${national.length} digits)` 
    }
  }

  if (!/^[6-9]\d{9}$/.test(national)) {
    return { 
      valid: false, 
      phone: '', 
      nationalNumber: '', 
      error: 'Indian mobile number must start with 6, 7, 8, or 9' 
    }
  }

  return { 
    valid: true, 
    phone: `91${national}`, 
    nationalNumber: national 
  }
}

/** Extracts a clean 10-digit national number from any stored recipient phone format for input editing. */
export function extractTenDigitWaPhone(value: string | null | undefined): string {
  if (!value) return ''
  const national = normalizeIndianPhoneInput(value)
  return national.slice(-10)
}

/**
 * Normalizes report_times array from database or user selection.
 * Cleans out obsolete legacy slots ('10:00', '13:00', '17:00', '20:00'),
 * and if empty or missing, defaults to all 6 active slots.
 */
export function normalizeWaReportTimings(reportTimes?: string[] | null): string[] {
  if (!reportTimes || !Array.isArray(reportTimes) || reportTimes.length === 0) {
    return [...ALL_WA_REPORT_SLOTS]
  }
  const filtered = reportTimes.filter(t => (ALL_WA_REPORT_SLOTS as readonly string[]).includes(t))
  return filtered.length > 0 ? filtered : [...ALL_WA_REPORT_SLOTS]
}

/**
 * Calculates next timings array when toggling a time slot.
 * Ensures toggling off from an empty (all-selected) state deselects that specific slot cleanly.
 */
export function toggleWaReportTiming(currentTimings: string[] | undefined | null, slot: string): string[] {
  const active = normalizeWaReportTimings(currentTimings)
  if (active.includes(slot)) {
    return active.filter(t => t !== slot)
  }
  return [...active, slot]
}


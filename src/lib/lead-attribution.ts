// Keep campaign metadata only: never copy arbitrary URL queries or contact data.
const keys = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
export type LeadAttribution = Partial<Record<typeof keys[number], string>>
const storageKey = 'bhuwanta_campaign_session_v1'
export function cleanAttribution(input: unknown): LeadAttribution {
  const result: LeadAttribution = {}
  if (!input || typeof input !== 'object') return result
  for (const key of keys) {
    const value = (input as Record<string, unknown>)[key]
    if (typeof value === 'string' && /^[\w .~+%:/-]{1,200}$/.test(value)) result[key] = value
  }
  return result
}
export function getLeadAttribution(): LeadAttribution {
  if (typeof window === 'undefined') return {}
  const current = cleanAttribution(Object.fromEntries(new URLSearchParams(window.location.search)))
  try {
    if (Object.keys(current).length) {
      // A new campaign replaces the previous one; don't mix click identifiers.
      window.sessionStorage.setItem(storageKey, JSON.stringify(current))
      return current
    }
    return cleanAttribution(JSON.parse(window.sessionStorage.getItem(storageKey) || '{}'))
  } catch { return current }
}
export function campaignSource(attribution: LeadAttribution): string | undefined {
  if (attribution.gclid || attribution.gbraid || attribution.wbraid) return 'Google Ads'
  if (/^google$/i.test(attribution.utm_source || '') && /^(cpc|ppc|paidsearch|paid)$/i.test(attribution.utm_medium || '')) return 'Google Ads'
  return undefined
}
export function whatsappSourceHint(message: string): string | undefined {
  return message.includes('[Bhuwanta website source: Google Ads]') ? 'Google Ads' : undefined
}
export function attributedWhatsAppUrl(href: string): string {
  const url = new URL(href)
  if (url.protocol !== 'https:' || !['wa.me', 'api.whatsapp.com'].includes(url.hostname) || campaignSource(getLeadAttribution()) !== 'Google Ads') return href
  const marker = '[Bhuwanta website source: Google Ads]'
  const text = url.searchParams.get('text') || 'Hi Bhuwanta, I would like plot details.'
  if (!text.includes(marker)) url.searchParams.set('text', `${text}\n${marker}`)
  return url.toString()
}

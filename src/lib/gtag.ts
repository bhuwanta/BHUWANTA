// This Ads action records saved enquiries only. Clicks are separate GA events.
const LEAD_CONVERSION_SEND_TO = 'AW-18267535069/8DW6COSx2c8cEN3t0YZE'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/** Call only after the lead API confirms a successful save. */
export function fireLeadConversion() {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', { send_to: LEAD_CONVERSION_SEND_TO })
  }
}

/** Opening WhatsApp does not establish that the visitor sent a message. */
export function trackWhatsAppClick() {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'whatsapp_click', { contact_method: 'whatsapp' })
  }
}

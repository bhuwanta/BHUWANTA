// This Ads action records saved enquiries only. Clicks are separate GA events.
const LEAD_CONVERSION_SEND_TO = 'AW-18301435119/N10ICO3ygPscEO_55pZE'
const ANALYTICS_SEND_TO = 'G-98QJJZ5DCG'

type EnquiryStep = 'start' | 'otp_requested' | 'otp_sent' | 'otp_failed' |
  'otp_verified' | 'verification_failed' | 'submission_started' |
  'submission_failed' | 'submission_succeeded'

/** Diagnostic events only: never send contact values, OTPs or raw errors. */
export function trackEnquiryStep(step: EnquiryStep, form: 'contact' | 'popup') {
  if (typeof window === 'undefined') return
  try {
    window.dataLayer = window.dataLayer || []
    // eslint-disable-next-line prefer-rest-params
    window.gtag = window.gtag || function () { window.dataLayer!.push(arguments) }
    const path = window.location?.pathname
    const project = path === '/projects/arudra' ? 'arudra' :
      path === '/shabad-open-plots' ? 'vian_valley' : 'other'
    window.gtag('event', `enquiry_${step}`, {
      send_to: ANALYTICS_SEND_TO,
      form_id: form,
      project_group: project,
    })
  } catch {
    // Analytics must never prevent an enquiry from being submitted.
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/** Call only after the lead API confirms a successful save. */
export function fireLeadConversion(leadId?: string) {
  if (typeof window === 'undefined' || !leadId) return
  // Queue safely even if the network loader has not finished.
  window.dataLayer = window.dataLayer || []
  // Google tag's bootstrap queues IArguments, not a plain data-layer event object.
  // eslint-disable-next-line prefer-rest-params
  window.gtag = window.gtag || function () { window.dataLayer!.push(arguments) }
  window.gtag('event', 'conversion', {
    send_to: LEAD_CONVERSION_SEND_TO,
    transaction_id: leadId,
  })
}

/** A requested document is engagement, not the primary sales-enquiry action. */
export function trackDocumentDownload(leadId?: string) {
  if (typeof window === 'undefined' || !leadId) return
  window.dataLayer = window.dataLayer || []
  // Google tag's bootstrap queues IArguments, not a plain data-layer event object.
  // eslint-disable-next-line prefer-rest-params
  window.gtag = window.gtag || function () { window.dataLayer!.push(arguments) }
  window.gtag('event', 'document_download', { transaction_id: leadId })
}

/** Opening WhatsApp does not establish that the visitor sent a message. */
export function trackWhatsAppClick() {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'whatsapp_click', { contact_method: 'whatsapp' })
  }
}

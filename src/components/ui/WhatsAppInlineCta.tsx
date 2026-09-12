'use client'

import { fireLeadConversion } from '@/lib/gtag'

const WHATSAPP_NUMBER = '919666504405'

export function WhatsAppInlineCta({
  context,
  label = 'Chat on WhatsApp',
  message: customMessage,
  className = '',
  trackConversion = true,
}: {
  context: string
  label?: string
  /** Overrides the default investor-pricing wording where it doesn't fit. */
  message?: string
  className?: string
  /**
   * Pages that already fire the lead conversion on load (the thank-you page)
   * pass false, so clicking through doesn't count a second conversion.
   */
  trackConversion?: boolean
}) {
  const message = customMessage || `Hi Bhuwanta, I'm interested in investor pricing for ${context}. Please share details.`
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={trackConversion ? fireLeadConversion : undefined}
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] text-white text-sm font-semibold rounded-lg shadow-lg shadow-[#25D366]/20 hover:scale-105 transition-premium ${className}`}
    >
      {label}
    </a>
  )
}

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { attributedWhatsAppUrl, getLeadAttribution } from '@/lib/lead-attribution'

export function LeadAttributionCapture() {
  const pathname = usePathname()
  useEffect(() => {
    getLeadAttribution()
    // Add only a readable source hint, never raw ad identifiers, to WhatsApp.
    // A sent message with this hint is source evidence, not a Google conversion.
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null
      if (link) link.href = attributedWhatsAppUrl(link.href)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname])
  return null
}

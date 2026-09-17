'use client'

import { trackWhatsAppClick } from '@/lib/gtag'

// Thin client wrapper so server-component pages can drop a tracked WhatsApp
// link in with their own bespoke styling, without needing to convert the
// whole page to a client component.
export function TrackedWhatsAppAnchor({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={trackWhatsAppClick} className={className}>
      {children}
    </a>
  )
}

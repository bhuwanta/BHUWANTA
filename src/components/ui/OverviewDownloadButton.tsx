'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { DownloadPopup } from '@/components/ui/DownloadPopup'

/**
 * The "Download Projects Overview" action, shared by the /projects filter row
 * and the homepage projects section.
 *
 * It opens the same DownloadPopup as the project brochures, so the visitor goes
 * through the same name/phone/OTP step and the lead reaches the CRM by the same
 * /api/contact path — one lead flow for every document on the site, not two.
 */
export function OverviewDownloadButton({
  urls,
  label,
  variant = 'pill',
  className = '',
}: {
  urls?: string[] | null
  label?: string
  /** 'pill' matches the /projects filter row; 'solid' matches homepage CTAs. */
  variant?: 'pill' | 'solid'
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  // overviewPdf[].asset->url resolves to null, not [], when nothing is uploaded.
  const hasPdf = Boolean(urls && urls.length > 0)
  const text = label || 'Download Projects Overview'

  const base =
    variant === 'pill'
      ? 'lg:flex-none flex items-center justify-center gap-1.5 text-xs lg:text-sm font-semibold px-4 lg:px-5 py-2 rounded-full whitespace-nowrap gradient-gold text-white shadow-md'
      : 'inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold rounded-xl gradient-gold text-white shadow-lg shadow-[#c4a55a]/20'

  return (
    <>
      <button
        type="button"
        disabled={!hasPdf}
        title={hasPdf ? undefined : 'Coming soon'}
        onClick={() => setIsOpen(true)}
        className={`${base} transition-all duration-300 enabled:hover:scale-105 enabled:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        <Download className={variant === 'pill' ? 'w-3.5 h-3.5 lg:w-4 lg:h-4' : 'w-4 h-4'} />
        <span>{text}</span>
      </button>

      <DownloadPopup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        urls={urls || []}
        projectName="Bhuwanta Projects"
        documentType={label || 'Projects Overview'}
      />
    </>
  )
}

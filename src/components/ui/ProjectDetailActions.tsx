'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Download, CreditCard, Play } from 'lucide-react'
import { ProjectImageCarousel } from '@/components/ui/ProjectImageCarousel'
import { DownloadPopup } from '@/components/ui/DownloadPopup'
import { fireLeadConversion } from '@/lib/gtag'

interface ProjectDetailActionsProps {
  name: string
  images?: string[]
  videoUrl?: string
  youtubeUrl?: string
  googleMapsUrl?: string
  brochureUrls?: string[]
  layoutUrls?: string[]
  reraUrls?: string[]
  hmdaDtcpUrls?: string[]
  approvalCertificateLabel?: string
  /** Slug this project is served at — needed to link to its videos page. */
  slug?: string
  /** count() in GROQ returns null (not 0) when the field was never set. */
  videoCount?: number | null
}

export function ProjectDetailActions({
  name,
  images,
  videoUrl,
  youtubeUrl,
  googleMapsUrl,
  brochureUrls,
  layoutUrls,
  reraUrls,
  hmdaDtcpUrls,
  approvalCertificateLabel,
  slug,
  videoCount,
}: ProjectDetailActionsProps) {
  const [downloadQueue, setDownloadQueue] = useState<{ urls: string[]; documentType: string } | null>(null)
  const showVideos = (videoCount ?? 0) > 0 && Boolean(slug)
  // Mobile grid is 2 columns; two buttons here are conditional, so whether the
  // last one must span both columns to sit flush depends on the count.
  const buttonCount = 6 + (googleMapsUrl ? 1 : 0) + (showVideos ? 1 : 0)
  const lastButtonSpan = buttonCount % 2 === 0 ? 'col-span-1' : 'col-span-2'

  return (
    <>
      <div className="w-full aspect-[16/10] relative bg-[#f3f5f8] rounded-2xl overflow-hidden border border-[#e8ecf2]">
        <ProjectImageCarousel images={images} projectName={name} videoUrl={videoUrl} youtubeUrl={youtubeUrl} />
      </div>

      <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 md:gap-3 mt-6">
        <Link
          href={`/#book-visit?project=${encodeURIComponent(name)}`}
          className="w-full col-span-1 px-2 py-2.5 md:px-6 md:w-auto gradient-gold text-white font-semibold rounded-lg shadow-lg shadow-[#c4a55a]/20 hover:scale-105 transition-premium text-xs sm:text-sm text-center flex items-center justify-center md:justify-start"
        >
          Enquire Now
        </Link>
        <a
          href={`https://wa.me/919666504405?text=${encodeURIComponent(`Hi Bhuwanta, I'm interested in investor pricing for ${name}. Please share details.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={fireLeadConversion}
          className="w-full col-span-1 px-2 py-2.5 md:px-5 md:w-auto bg-[#25D366] text-white font-semibold rounded-lg hover:opacity-90 transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start"
        >
          WhatsApp
        </a>
        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full col-span-1 px-2 py-2.5 md:px-5 md:w-auto bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] hover:shadow-md transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start gap-1 md:gap-2"
          >
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#c4a55a] flex-shrink-0" /> <span className="truncate">View Location</span>
          </a>
        )}
        {showVideos && (
          <Link
            href={`/projects/${slug}/videos`}
            className="w-full col-span-1 px-2 py-2.5 md:px-5 md:w-auto bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] hover:shadow-md transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start gap-1 md:gap-2"
          >
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#c4a55a] flex-shrink-0" /> <span className="truncate">Videos</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setDownloadQueue({ urls: brochureUrls!, documentType: 'Brochure' })}
          disabled={!brochureUrls || brochureUrls.length === 0}
          className="w-full col-span-1 px-2 py-2.5 md:px-5 md:w-auto bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] hover:shadow-md transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start gap-1 md:gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#c4a55a] flex-shrink-0" /> <span className="truncate">Brochure</span>
        </button>
        <button
          type="button"
          onClick={() => setDownloadQueue({ urls: layoutUrls!, documentType: 'Layout' })}
          disabled={!layoutUrls || layoutUrls.length === 0}
          className="w-full col-span-1 px-2 py-2.5 md:px-5 md:w-auto bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] hover:shadow-md transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start gap-1 md:gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#c4a55a] flex-shrink-0" /> <span className="truncate">Layout</span>
        </button>
        <button
          type="button"
          onClick={() => setDownloadQueue({ urls: reraUrls!, documentType: 'RERA Documents' })}
          disabled={!reraUrls || reraUrls.length === 0}
          className="w-full col-span-1 px-2 py-2.5 md:px-5 md:w-auto bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] hover:shadow-md transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start gap-1 md:gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#c4a55a] flex-shrink-0" /> <span className="truncate">RERA Documents</span>
        </button>
        <button
          type="button"
          onClick={() => setDownloadQueue({ urls: hmdaDtcpUrls!, documentType: approvalCertificateLabel || 'HMDA/DTCP Approved' })}
          disabled={!hmdaDtcpUrls || hmdaDtcpUrls.length === 0}
          className={`w-full ${lastButtonSpan} md:col-span-1 px-2 py-2.5 md:px-5 md:w-auto bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] hover:shadow-md transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start gap-1 md:gap-2 disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#c4a55a] flex-shrink-0" /> <span className="truncate">{approvalCertificateLabel || 'HMDA/DTCP Approved'}</span>
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-[#e8ecf2] flex items-center gap-2 text-xs font-semibold text-[#5a6a82]">
        <CreditCard className="w-4 h-4 text-[#5a6a82]" />
        Ready for Construction
      </div>

      <DownloadPopup
        isOpen={downloadQueue !== null}
        onClose={() => setDownloadQueue(null)}
        urls={downloadQueue?.urls || []}
        projectName={name}
        documentType={downloadQueue?.documentType || ''}
      />
    </>
  )
}

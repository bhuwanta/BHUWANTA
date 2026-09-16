'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'

export interface ProjectHighlightImage {
  url?: string
  caption?: string
  alt?: string
  lqip?: string
  dimensions?: { width?: number; height?: number; aspectRatio?: number }
}

/** How many photos are shown before the "Show all" button appears. */
const INITIAL_COUNT = 12

export function ProjectHighlightImages({
  images,
  projectName,
}: {
  images: ProjectHighlightImage[]
  projectName: string
}) {
  const [showAll, setShowAll] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  // Focus goes back to the thumbnail the lightbox was opened from, rather than
  // to the top of the document, so keyboard users don't lose their place.
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])
  const returnFocusTo = useRef<number | null>(null)

  const usable = images.filter((img) => Boolean(img.url))
  const visible = showAll ? usable : usable.slice(0, INITIAL_COUNT)
  const hiddenCount = usable.length - visible.length

  const altFor = useCallback(
    (img: ProjectHighlightImage, idx: number) =>
      img.alt || img.caption || `${projectName} — photo ${idx + 1}`,
    [projectName]
  )

  const close = useCallback(() => {
    setLightboxIndex(null)
    const idx = returnFocusTo.current
    if (idx !== null) thumbRefs.current[idx]?.focus()
    returnFocusTo.current = null
  }, [])

  const open = (idx: number) => {
    returnFocusTo.current = idx
    setLightboxIndex(idx)
  }

  const step = useCallback(
    (delta: number) => {
      setLightboxIndex((current) => {
        if (current === null) return current
        // Wraps, so arrowing past either end stays inside the gallery instead
        // of silently doing nothing.
        return (current + delta + usable.length) % usable.length
      })
    },
    [usable.length]
  )

  // Escape / arrow keys, and a scroll lock on <body>. Without the lock the page
  // behind the overlay scrolls under the finger on iOS.
  useEffect(() => {
    if (lightboxIndex === null) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        step(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        step(-1)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [lightboxIndex, close, step])

  if (usable.length === 0) {
    return (
      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-12 text-center">
        <div className="w-16 h-16 bg-[#f3f5f8] rounded-full flex items-center justify-center mx-auto mb-4">
          <ImageOff className="w-8 h-8 text-[#1e3a5f]/40" />
        </div>
        <h3 className="text-xl font-bold text-[#0f1d33] mb-2">Photos Coming Soon</h3>
        <p className="text-[#5a6a82]">We&apos;re preparing site photographs for {projectName}.</p>
      </div>
    )
  }

  const active = lightboxIndex === null ? null : usable[lightboxIndex]

  return (
    <>
      {/* Columns, not a grid: every photo keeps its own aspect ratio, so
          nothing is cropped and nothing is letterboxed. A fixed 4:3 tile with
          object-cover cut the top and bottom off portrait shots; the same tile
          with object-contain would have padded them with grey bars. */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 lg:gap-6">
        {visible.map((img, idx) => {
          const width = img.dimensions?.width
          const height = img.dimensions?.height
          const blur = img.lqip ? { placeholder: 'blur' as const, blurDataURL: img.lqip } : {}
          const sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'

          return (
            <figure
              key={`${img.url}-${idx}`}
              className="mb-4 lg:mb-6 break-inside-avoid bg-white border border-[#e8ecf2] shadow-sm rounded-xl overflow-hidden transition-premium hover:shadow-md"
            >
              <button
                type="button"
                ref={(el) => {
                  thumbRefs.current[idx] = el
                }}
                onClick={() => open(idx)}
                aria-label={`Open ${altFor(img, idx)} full size`}
                className="group relative block w-full bg-[#f3f5f8] cursor-zoom-in"
              >
                {width && height ? (
                  // The real dimensions give the browser the ratio up front, so
                  // the column does not reflow as each photo loads.
                  <Image
                    src={img.url as string}
                    alt={altFor(img, idx)}
                    width={width}
                    height={height}
                    sizes={sizes}
                    className="w-full h-auto"
                    {...blur}
                  />
                ) : (
                  // Older entries have no dimensions metadata. Contain rather
                  // than cover, so an unknown photo is still shown whole.
                  <span className="relative block w-full aspect-[4/3]">
                    <Image
                      src={img.url as string}
                      alt={altFor(img, idx)}
                      fill
                      sizes={sizes}
                      className="object-contain"
                      {...blur}
                    />
                  </span>
                )}
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </button>
              {img.caption && (
                <figcaption
                  className="px-4 py-3 text-sm font-semibold text-[#0f1d33] leading-snug"
                  title={img.caption}
                >
                  {img.caption}
                </figcaption>
              )}
            </figure>
          )
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="px-6 py-3 bg-white border border-[#c4a55a] text-[#c4a55a] font-semibold rounded-lg hover:bg-[#f7f8fa] transition-premium text-sm"
          >
            Show all {usable.length} photos
          </button>
        </div>
      )}

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${projectName} photo ${(lightboxIndex ?? 0) + 1} of ${usable.length}`}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            autoFocus
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-50"
          >
            <X className="w-5 h-5" />
          </button>

          {usable.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  step(-1)
                }}
                aria-label="Previous photo"
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  step(1)
                }}
                aria-label="Next photo"
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div
            className="relative w-full h-full max-w-5xl mx-auto max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={active.url as string}
              alt={altFor(active, lightboxIndex ?? 0)}
              fill
              sizes="100vw"
              className="object-contain rounded-lg"
              priority
            />
          </div>

          <div className="absolute bottom-4 left-0 right-0 px-6 text-center pointer-events-none">
            {active.caption && (
              <p className="text-white text-sm font-semibold drop-shadow">{active.caption}</p>
            )}
            {usable.length > 1 && (
              <p className="text-white/60 text-xs mt-1">
                {(lightboxIndex ?? 0) + 1} / {usable.length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

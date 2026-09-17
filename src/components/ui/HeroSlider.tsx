'use client'

import { useState, useEffect } from 'react'

import Image from 'next/image'
import { sanityImageLoader } from '@/lib/sanity'

export function HeroSlider({ images }: { images: { url: string; text?: string }[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!images || images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(interval)
  }, [images])

  if (!images || images.length === 0) {
    return (
      <div className="absolute inset-0 gradient-dark" />
    )
  }

  return (
    <>
      {images.map((img, index) => {
        // Always h2 — the homepage has its own dedicated <h1>, so this
        // CMS-editable, per-slide caption (which may be empty) must never
        // compete for that role.
        const Tag = 'h2'
        // Only use the loader if it's a sanity image
        const isSanity = img.url.includes('cdn.sanity.io')
        
        return (
          <div
            key={img.url}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-0' : 'opacity-0 -z-10'
            }`}
          >
            {/* Background Image */}
            <Image 
              src={img.url}
              alt={img.text || 'Bhuwanta Hero'}
              fill
              sizes="100vw"
              priority={index === 0}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              loader={isSanity ? sanityImageLoader : undefined}
              className="object-cover object-center"
            />
            {/* Overlays to ensure text remains readable */}
            <div className="absolute inset-0 bg-brand-ink/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/80 via-transparent to-transparent" />
            
            {/* Dynamic Text Overlay */}
            {img.text && (
              <div className="absolute inset-0 flex items-center justify-center text-center px-4 z-20">
                <Tag className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow-xl text-white max-w-5xl mx-auto leading-tight">
                  {img.text.split('\n').map((line, i) => (
                    <span key={i} className="block">{line}</span>
                  ))}
                </Tag>
              </div>
            )}
          </div>
        )
      })}
      {/* Existing noise overlay for texture */}
      <div className="absolute inset-0 noise-overlay z-10 opacity-50" />
    </>
  )
}

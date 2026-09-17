'use client'

import { useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import Image from 'next/image'

interface ProjectImageCarouselProps {
  images?: string[]
  projectName: string
  videoUrl?: string
  youtubeUrl?: string
}

export function ProjectImageCarousel({ images, projectName, videoUrl, youtubeUrl }: ProjectImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    // Do not run the image carousel if we have a video
    if (youtubeUrl || videoUrl || !images || images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [images, videoUrl, youtubeUrl])

  // Handle YouTube Video
  if (youtubeUrl) {
    const videoIdMatch = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([^&?]+)/)
    const videoId = videoIdMatch ? videoIdMatch[1] : null
    
    if (videoId) {
      return (
        <div className="absolute inset-0 w-full h-full bg-black z-20 pointer-events-auto group-hover:pointer-events-auto">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&showinfo=0&rel=0`}
            title={`${projectName} Video`}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    }
  }

  // Handle Direct MP4 Video
  if (videoUrl) {
    return (
      <div className="absolute inset-0 w-full h-full bg-black z-20 pointer-events-auto">
        <video 
          src={videoUrl} 
          autoPlay 
          loop 
          muted 
          controls
          playsInline 
          className="w-full h-full object-contain"
        />
      </div>
    )
  }

  // Handle No Media Fallback
  if (!images || images.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-brand-soft">
        <MapPin className="w-10 h-10 text-brand-primary/20 relative z-20" />
      </div>
    )
  }

  // Handle Image Carousel
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-brand-soft">
      {images.map((imgUrl, i) => (
        <div
          key={i}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
            i === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <Image
            src={imgUrl}
            alt={`${projectName} - Image ${i + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={`object-cover transition-transform duration-[5000ms] ease-out ${
              i === currentIndex ? 'scale-100' : 'scale-110'
            }`}
          />
        </div>
      ))}
      
      {/* Dots Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, Film } from 'lucide-react'
import { extractYouTubeId } from '@/lib/utils'

export interface ProjectVideo {
  title: string
  description?: string
  source?: 'youtube' | 'upload'
  youtubeUrl?: string
  recordedAt?: string
  videoUrl?: string
  thumbnailUrl?: string
}

function formatRecordedAt(date?: string): string | null {
  if (!date) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

/**
 * Nothing plays until it is clicked.
 *
 * Uploaded MP4s stream from the Sanity asset CDN and count against the monthly
 * bandwidth quota, which is the binding limit on this plan — mounting several
 * players on load would spend it on visitors who never press play. So each
 * card shows a poster until clicked, and <video> carries preload="none".
 */
function VideoCard({ video }: { video: ProjectVideo }) {
  const [isPlaying, setIsPlaying] = useState(false)
  // YouTube only generates maxresdefault for videos uploaded above 720p, so it
  // 404s on plenty of them. hqdefault always exists — fall back on error.
  const [posterFailed, setPosterFailed] = useState(false)

  // Branch on `source` first, never on which URL happens to be populated:
  // Sanity keeps the value of a conditionally hidden field, so a video switched
  // from YouTube to upload can still carry a stale youtubeUrl.
  const isUpload = video.source === 'upload'
  const youtubeId = !isUpload && video.youtubeUrl ? extractYouTubeId(video.youtubeUrl) : null
  const playable = isUpload ? Boolean(video.videoUrl) : Boolean(youtubeId)

  const youtubePoster = youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/${posterFailed ? 'hqdefault' : 'maxresdefault'}.jpg`
    : null
  // Uploaded videos have no auto-generated poster frame, and pulling one from
  // the video file itself would cost bandwidth for visitors who never press
  // play. Falling back to the project's own photo keeps the card looking like
  // the cards on /projects instead of a black rectangle.
  const poster = video.thumbnailUrl || youtubePoster

  const recorded = formatRecordedAt(video.recordedAt)

  return (
    <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl overflow-hidden flex flex-col transition-premium hover:shadow-md">
      <div className="relative aspect-video bg-black overflow-hidden">
        {!playable ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
            <Film className="w-8 h-8" />
            <span className="text-xs font-medium">Video unavailable</span>
          </div>
        ) : isPlaying ? (
          // Absolutely positioned, exactly like ProjectImageCarousel on
          // /projects. A plain h-full child resolves its height against an
          // auto height and falls back to the video's intrinsic size, which
          // stretched the card for portrait footage.
          <div className="absolute inset-0 w-full h-full bg-black">
            {isUpload ? (
              <video
                src={video.videoUrl}
                controls
                autoPlay
                playsInline
                // Hides the download item in the browser's native video menu.
                // It only removes the obvious route — the file URL is still
                // public, so this is tidiness, not protection.
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                className="w-full h-full object-contain"
              />
            ) : (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                title={video.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            aria-label={`Play ${video.title}`}
            className="group absolute inset-0 w-full h-full cursor-pointer"
          >
            {poster ? (
              <Image
                src={poster}
                alt={video.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-contain"
                onError={() => setPosterFailed(true)}
              />
            ) : isUpload && video.videoUrl ? (
              // The real first frame of the actual video, rather than an
              // unrelated project photo. #t=0.1 makes the browser seek to and
              // paint that frame; preload="metadata" fetches only the header
              // and that one frame, not the whole file.
              <video
                src={`${video.videoUrl}#t=0.1`}
                preload="metadata"
                muted
                playsInline
                tabIndex={-1}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <div className="absolute inset-0 bg-[#0f1d33]" />
            )}
            <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center shadow-lg group-hover:scale-110 transition-premium">
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </div>
            </div>
          </button>
        )}
      </div>

      {/* The title sits directly beneath the video — this is the point of the page. */}
      <div className="p-5 flex flex-col gap-1.5">
        <h3 className="text-lg font-bold text-[#0f1d33] leading-snug truncate" title={video.title}>
          {video.title}
        </h3>
        {video.description && (
          <p className="text-sm text-[#5a6a82] leading-relaxed line-clamp-2">{video.description}</p>
        )}
        {recorded && <p className="text-xs font-semibold text-[#c4a55a] uppercase tracking-wider mt-1">{recorded}</p>}
      </div>
    </div>
  )
}

export function ProjectVideosGrid({ videos }: { videos: ProjectVideo[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {videos.map((video, idx) => (
        <VideoCard key={`${video.title}-${idx}`} video={video} />
      ))}
    </div>
  )
}

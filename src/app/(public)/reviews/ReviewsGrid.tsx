'use client'

import { Film } from 'lucide-react'

interface ReviewsData {
  pageHeading?: string
  reviewVideos?: string[]
  reviewYoutubeUrls?: string[]
}

interface ReviewsGridProps {
  reviewsData?: ReviewsData | null
}

export function ReviewsGrid({ reviewsData = null }: ReviewsGridProps) {
  const validReviewVideos = reviewsData?.reviewVideos ? reviewsData.reviewVideos.filter(Boolean) : []
  
  const validReviewYoutube = reviewsData?.reviewYoutubeUrls ? reviewsData.reviewYoutubeUrls.map(url => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([^&?]+)/)
    return match ? match[1] : null
  }).filter(Boolean) as string[] : []

  const hasVideos = validReviewVideos.length > 0 || validReviewYoutube.length > 0

  return (
    <div className="py-16 bg-[#f7f8fa] min-h-[50vh]">
      <div className="max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 lg:w-[95%] xl:w-[92%] mx-auto">
        
        {!hasVideos ? (
          <div className="text-center py-12">
            <Film className="w-16 h-16 text-[#e8ecf2] mx-auto mb-4" />
            <p className="text-[#5a6a82] text-lg">No customer reviews available at the moment.</p>
          </div>
        ) : (
          <section className="bg-white rounded-2xl shadow-sm border border-[#e8ecf2] p-6 sm:p-10">
            <div className="mb-10 text-center">
              <p className="text-sm text-[#c4a55a] uppercase tracking-widest font-bold mb-2">Hear From Them</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0f1d33]">Customer Experiences</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* YouTube Videos */}
              {validReviewYoutube.map((youtubeId, idx) => (
                <div key={`yt-${idx}`} className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl overflow-hidden group hover:shadow-md transition-premium h-fit">
                  <div className="aspect-video relative bg-[#f3f5f8]">
                    <iframe 
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      title={`Customer Review - YouTube Video ${idx + 1}`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-[#0f1d33]">Customer Review</h3>
                    <p className="text-sm text-[#5a6a82] mt-1">YouTube Video</p>
                  </div>
                </div>
              ))}

              {/* Uploaded Videos */}
              {validReviewVideos.map((videoUrl, idx) => (
                <div key={`vid-${idx}`} className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl overflow-hidden group hover:shadow-md transition-premium h-fit">
                  <div className="relative bg-black flex items-center justify-center aspect-video">
                    <video 
                      src={videoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                  </div>
                  <div className="p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-[#0f1d33]">Customer Review</h3>
                    <p className="text-sm text-[#5a6a82] mt-1">Uploaded Video</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

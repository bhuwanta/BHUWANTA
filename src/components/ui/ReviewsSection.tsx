import React from 'react'
import { Star } from 'lucide-react'

interface Review {
  name: string
  role: string
  rating: number
  content: string
}

interface ReviewsSectionProps {
  reviews: Review[]
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {reviews.map((review, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-8 border border-brand-border shadow-sm hover:shadow-md transition-premium flex flex-col h-full"
        >
          {/* Rating */}
          <div className="flex gap-1 mb-6">
            {[...Array(5)].map((_, starIndex) => (
              <Star
                key={starIndex}
                className={`w-4 h-4 ${starIndex < review.rating ? 'text-brand-accent fill-brand-gold' : 'text-brand-border'}`}
              />
            ))}
          </div>

          <p className="text-brand-muted leading-relaxed mb-8 flex-grow italic">
            &ldquo;{review.content}&rdquo;
          </p>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center text-white font-bold text-sm">
              {review.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-brand-deep text-sm">{review.name}</h3>
              <p className="text-xs text-brand-muted">{review.role}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

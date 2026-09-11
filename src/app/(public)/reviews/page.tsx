import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo'
import { sanityFetch, reviewsQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd'
import { PageBanner } from '@/components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { ReviewsGrid } from './ReviewsGrid'
import { getSiteUrl } from '@/lib/site-url'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('reviews', 'Customer Reviews', 'Hear directly from our customers about their experiences with Bhuwanta.')
}

export const revalidate = 120

interface ReviewsData {
  pageHeading?: string
  reviewVideos?: string[]
  reviewYoutubeUrls?: string[]
}

export default async function ReviewsPage() {
  let reviewsData: ReviewsData | null = null

  try {
    const sanityData = await sanityFetch<ReviewsData>({ query: reviewsQuery, tags: ['reviews'] })
    if (sanityData) {
      reviewsData = sanityData
    }
  } catch (error) {
    console.error("Reviews fetch error:", error)
  }

  const siteUrl = getSiteUrl()
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Reviews', url: `${siteUrl}/reviews` },
  ])

  const headingText = reviewsData?.pageHeading || 'Customer Reviews'

  return (
    <>
      <JsonLd data={[breadcrumb]} />

      <PageBanner 
        title={<>Customer <span className="text-[#c4a55a]">Reviews</span></>} 
      />

      <ReviewsGrid reviewsData={reviewsData} />

      <CtaSection />
    </>
  )
}

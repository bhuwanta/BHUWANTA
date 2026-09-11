import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo'
import { sanityFetch, galleryQuery } from '@/lib/sanity'
import { extractYouTubeId } from '@/lib/utils'
import { JsonLd, buildBreadcrumbSchema, buildImageGallerySchema } from '@/components/seo/JsonLd'
import { GalleryGrid } from './GalleryGrid'
import { PageBanner } from '../../../components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { getSiteUrl } from '@/lib/site-url'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('gallery', 'Gallery', 'See the land for yourself. Every photo is real — no renderings, no stock images. Browse site views, layouts, and development progress.')
}

export const revalidate = 120

interface ProjectEntry {
  name?: string
  categoryTitle?: string
  images?: string[]
  videoUrl?: string
  youtubeUrl?: string
  videoUrls?: string[]
  youtubeUrls?: string[]
}

interface GalleryData {
  pageHeading?: string
  siteVisitImages?: string[]
  siteVisitVideos?: string[]
  siteVisitYoutubeUrls?: string[]
  generalImages?: string[]
  generalVideos?: string[]
  generalYoutubeUrls?: string[]
}

export default async function GalleryPage() {
  let projects: Array<{
    name: string
    categoryTitle: string | null
    images: string[]
    videoUrls: string[]
    youtubeIds: string[]
  }> = []

  let gallerySingleton: GalleryData | null = null

  try {
    const sanityData = await sanityFetch<{
      projectsData?: { projectEntries?: ProjectEntry[] }
      galleryData?: GalleryData
    }>({ query: galleryQuery, tags: ['projects', 'gallery'] })

    if (sanityData?.galleryData) {
      gallerySingleton = sanityData.galleryData
    }

    if (sanityData?.projectsData?.projectEntries) {
      projects = sanityData.projectsData.projectEntries
        .filter((p) => p.name)
        .map((p) => {
          const videoUrls = []
          if (p.videoUrl) videoUrls.push(p.videoUrl)
          if (p.videoUrls) videoUrls.push(...p.videoUrls.filter(Boolean))

          const youtubeIds = []
          if (p.youtubeUrl) {
            const id = extractYouTubeId(p.youtubeUrl)
            if (id) youtubeIds.push(id)
          }
          if (p.youtubeUrls) {
            p.youtubeUrls.forEach(url => {
              const id = extractYouTubeId(url)
              if (id) youtubeIds.push(id)
            })
          }

          return {
            name: p.name || 'Untitled Project',
            categoryTitle: p.categoryTitle || null,
            images: (p.images || []).filter(Boolean),
            videoUrls,
            youtubeIds,
          }
        })
    }
  } catch (error) {
    console.error("Gallery fetch error:", error)
  }

  const siteUrl = getSiteUrl()
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Gallery', url: `${siteUrl}/gallery` },
  ])

  const projectImages = projects.flatMap((p) => p.images)
  const siteVisitImages = gallerySingleton?.siteVisitImages || []
  const generalImages = gallerySingleton?.generalImages || []
  const allImages = [...projectImages, ...siteVisitImages, ...generalImages]

  const gallerySchema = allImages.length > 0
    ? buildImageGallerySchema(allImages.map(url => ({ url, caption: '' })))
    : null

  return (
    <>
      <JsonLd data={gallerySchema ? [breadcrumb, gallerySchema] : [breadcrumb]} />

      <PageBanner 
        title={<>Our <span className="text-[#c4a55a]">Gallery</span></>} 
      />

      <div className="flex-1 bg-[#f7f8fa]">
        <GalleryGrid projects={projects} gallerySingleton={gallerySingleton} />
      </div>

      <CtaSection />
    </>
  )
}

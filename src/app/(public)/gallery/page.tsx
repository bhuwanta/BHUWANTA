import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo'
import { sanityFetch, galleryQuery } from '@/lib/sanity'
import { extractYouTubeId } from '@/lib/utils'
import { JsonLd, buildBreadcrumbSchema, buildImageGallerySchema } from '@/components/seo/JsonLd'
import { GalleryGrid, type GalleryImage, type GalleryVideo, type GalleryYoutube, type ProjectGallery } from './GalleryGrid'
import { PageBanner } from '../../../components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { getSiteUrl } from '@/lib/site-url'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('gallery', 'Gallery', 'See the land for yourself. Every photo is real — no renderings, no stock images. Browse site views, layouts, and development progress.')
}

export const revalidate = 120

interface ProjectEntry {
  name?: string
  slug?: string
  categoryTitle?: string
  images?: string[]
  videoUrl?: string
  youtubeUrl?: string
  videoUrls?: string[]
  youtubeUrls?: string[]
  highlightImages?: Array<{ url?: string; caption?: string; alt?: string }>
  projectVideos?: Array<{
    title?: string
    source?: string
    youtubeUrl?: string
    videoUrl?: string
    thumbnailUrl?: string
  }>
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

// Merges a project's card photos/legacy videos with its Project Highlights
// uploads, so everything an editor added to the project appears in the
// gallery's Photos and Videos tabs. The same asset is often uploaded to both
// the card and the highlights, so each list is deduped per project.
function toProjectGallery(p: ProjectEntry): ProjectGallery {
  const images: GalleryImage[] = []
  const seenImages = new Set<string>()
  const addImage = (img: GalleryImage) => {
    if (!img.url || seenImages.has(img.url)) return
    seenImages.add(img.url)
    images.push(img)
  }
  ;(p.images || []).forEach((url) => addImage({ url }))
  ;(p.highlightImages || []).forEach((img) => {
    if (img.url) addImage({ url: img.url, caption: img.caption, alt: img.alt })
  })

  // Titled highlight videos go first so that when the same video is also in a
  // legacy field, the titled copy is the one kept.
  const youtube: GalleryYoutube[] = []
  const seenYoutube = new Set<string>()
  const addYoutube = (url: string | undefined, title?: string) => {
    const id = url ? extractYouTubeId(url) : null
    if (!id || seenYoutube.has(id)) return
    seenYoutube.add(id)
    youtube.push({ id, title })
  }

  const videos: GalleryVideo[] = []
  const seenVideos = new Set<string>()
  const addVideo = (url: string | undefined, title?: string, poster?: string) => {
    if (!url || seenVideos.has(url)) return
    seenVideos.add(url)
    videos.push({ url, title, poster })
  }

  ;(p.projectVideos || []).forEach((v) => {
    if (v.source === 'upload') addVideo(v.videoUrl, v.title, v.thumbnailUrl)
    else addYoutube(v.youtubeUrl, v.title)
  })
  addYoutube(p.youtubeUrl)
  ;(p.youtubeUrls || []).forEach((url) => addYoutube(url))
  addVideo(p.videoUrl)
  ;(p.videoUrls || []).forEach((url) => addVideo(url))

  return {
    name: p.name || 'Untitled Project',
    slug: p.slug || null,
    hasHighlights: (p.highlightImages?.length || 0) + (p.projectVideos?.length || 0) > 0,
    categoryTitle: p.categoryTitle || null,
    images,
    videos,
    youtube,
  }
}

export default async function GalleryPage() {
  let projects: ProjectGallery[] = []

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
        .map(toProjectGallery)
    }
  } catch (error) {
    console.error("Gallery fetch error:", error)
  }

  const siteUrl = getSiteUrl()
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Gallery', url: `${siteUrl}/gallery` },
  ])

  const projectImages = projects.flatMap((p) => p.images.map((img) => ({ url: img.url, caption: img.caption })))
  const siteVisitImages = (gallerySingleton?.siteVisitImages || []).map((url) => ({ url }))
  const generalImages = (gallerySingleton?.generalImages || []).map((url) => ({ url }))
  const allImages = [...projectImages, ...siteVisitImages, ...generalImages].filter((img) => img.url)

  const gallerySchema = allImages.length > 0
    ? buildImageGallerySchema(allImages)
    : null

  return (
    <>
      <JsonLd data={gallerySchema ? [breadcrumb, gallerySchema] : [breadcrumb]} />

      <PageBanner
        title={<>Our <span className="text-brand-accent">Gallery</span></>}
      />

      <div className="flex-1 bg-brand-paper">
        <GalleryGrid projects={projects} gallerySingleton={gallerySingleton} />
      </div>

      <CtaSection />
    </>
  )
}

import { extractYouTubeId } from './utils'

// Shapes and helpers for /gallery, kept free of React so they can be unit tested.

export interface GalleryImage {
  url: string
  caption?: string
  alt?: string
}

export interface GalleryVideo {
  url: string
  title?: string
  poster?: string
}

export interface GalleryYoutube {
  id: string
  title?: string
}

export interface ProjectGallery {
  name: string
  // CMS slug; the Project Highlights page is looked up by it, so without one
  // there is no page to link to.
  slug: string | null
  hasHighlights: boolean
  categoryTitle: string | null
  images: GalleryImage[]
  videos: GalleryVideo[]
  youtube: GalleryYoutube[]
}

export interface ProjectEntry {
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

// Merges a project's card photos/legacy videos with its Project Highlights
// uploads, so everything an editor added to the project appears in the
// gallery's Photos and Videos tabs. The same asset is often uploaded to both
// the card and the highlights, so each list is deduped per project.
export function toProjectGallery(p: ProjectEntry): ProjectGallery {
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

// The marquee moves its whole track in one animation cycle, so a fixed
// duration makes rows with more photos scroll faster. Scaling the duration by
// photo count keeps every row at the same speed.
export const MARQUEE_SECONDS_PER_IMAGE = 6

export function marqueeStyle(imageCount: number) {
  return { animationDuration: `${Math.max(imageCount, 1) * MARQUEE_SECONDS_PER_IMAGE}s` }
}

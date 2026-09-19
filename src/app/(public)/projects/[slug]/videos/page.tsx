import { enquiryHref, displayProjectName, displayProjectPlace } from '@/lib/project-links'
import { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Film, MessageCircle } from 'lucide-react'
import { sanityFetch, projectVideosBySlugQuery, projectSlugsQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema, buildVideoObjectSchema, buildImageGallerySchema } from '@/components/seo/JsonLd'
import { PageBanner } from '@/components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { ProjectVideosGrid, type ProjectVideo } from '@/components/ui/ProjectVideosGrid'
import { ProjectHighlightImages, type ProjectHighlightImage } from '@/components/ui/ProjectHighlightImages'
import { ProjectHighlightsTabs } from '@/components/ui/ProjectHighlightsTabs'
import { extractYouTubeId } from '@/lib/utils'
import { getSiteUrl } from '@/lib/site-url'

interface ProjectVideosData {
  name: string
  slug?: { current: string }
  location?: string
  categoryTitle?: string
  images?: string[]
  videosPageHeading?: string
  videosPageIntro?: string
  projectVideos?: ProjectVideo[]
  highlightImages?: ProjectHighlightImage[]
  legacyVideoUrls?: string[]
  legacyYoutubeUrls?: string[]
  legacyVideoUrl?: string
  legacyYoutubeUrl?: string
}

// Matches the parent /projects/[slug] route. Publishing in Sanity fires the
// revalidate webhook, which busts this page directly.
export const revalidate = 60

/**
 * Projects that still only have the old untitled `videoFiles` / `youtubeUrls`
 * entries get shown too, rather than an empty page — just without real titles,
 * since those fields never had one. Re-entering them under Project Videos in
 * Sanity replaces these with properly titled cards.
 */
function withLegacyFallback(project: ProjectVideosData): ProjectVideo[] {
  const videos = (project.projectVideos || []).filter((v) => v && v.title)
  if (videos.length > 0) return videos

  const legacy: ProjectVideo[] = []
  const seen = new Set<string>()

  const addYoutube = (url?: string | null) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    legacy.push({ title: `Video ${legacy.length + 1}`, source: 'youtube', youtubeUrl: url })
  }
  const addUpload = (url?: string | null) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    legacy.push({ title: `Video ${legacy.length + 1}`, source: 'upload', videoUrl: url })
  }

  // Both the singular legacy fields (what the project card carousel plays) and
  // the plural ones. Deduped, because an editor may have put the same file in
  // both, and some entries have no resolvable asset at all.
  addYoutube(project.legacyYoutubeUrl)
  ;(project.legacyYoutubeUrls || []).forEach(addYoutube)
  addUpload(project.legacyVideoUrl)
  ;(project.legacyVideoUrls || []).forEach(addUpload)

  return legacy
}

/** Drops rows an editor added but never uploaded a photo into. */
function usableImages(project: ProjectVideosData): ProjectHighlightImage[] {
  return (project.highlightImages || []).filter((img) => img && img.url)
}

async function getProject(slug: string): Promise<ProjectVideosData | null> {
  return sanityFetch<ProjectVideosData | null>({
    query: projectVideosBySlugQuery,
    params: { slug },
    tags: ['projects'],
  }).catch(() => null)
}

export async function generateStaticParams() {
  try {
    const slugs = await sanityFetch<string[]>({ query: projectSlugsQuery, tags: ['projects'] })
    return (slugs || []).map((slug) => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project) return { title: 'Project Not Found' }

  const name = displayProjectName(project.name)
  const siteUrl = getSiteUrl()
  const videos = withLegacyFallback(project)
  const images = usableImages(project)
  const longTitle = `${name} Project Highlights | Bhuwanta`
  const title = longTitle.length <= 60 ? longTitle : `${name} Highlights | Bhuwanta`

  // Describes what the page actually holds, so a photos-only project doesn't
  // advertise videos it does not have.
  const parts: string[] = []
  if (videos.length > 0) parts.push(`${videos.length} video${videos.length === 1 ? '' : 's'}`)
  if (images.length > 0) parts.push(`${images.length} photo${images.length === 1 ? '' : 's'}`)
  const description =
    project.videosPageIntro?.slice(0, 155) ||
    `${parts.length > 0 ? `See ${parts.join(' and ')} of` : 'Project highlights for'} ${name}${project.location ? ` in ${displayProjectPlace(project.location)}` : ''}, site walkthroughs, drone tours and photographs from Bhuwanta.`

  const firstThumb =
    videos.find((v) => v.thumbnailUrl)?.thumbnailUrl ||
    images[0]?.url ||
    project.images?.[0] ||
    `${siteUrl}/api/og?title=${encodeURIComponent(name)}&subtitle=${encodeURIComponent('Project Highlights')}`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${siteUrl}/projects/${slug}/videos` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/projects/${slug}/videos`,
      type: 'website',
      ...(firstThumb ? { images: [{ url: firstThumb }] } : {}),
    },
  }
}

export default async function ProjectVideosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await getProject(slug)

  // A slug that doesn't resolve is a genuine 404. A project with no videos is
  // not — that page is legitimate and about to have content, so it renders an
  // empty state instead and stays safe to share.
  if (!project) return notFound()

  const name = project.name.trim()
  const videos = withLegacyFallback(project)
  const images = usableImages(project)
  const siteUrl = getSiteUrl()
  const pageUrl = `${siteUrl}/projects/${slug}/videos`

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Projects', url: `${siteUrl}/projects` },
    { name, url: `${siteUrl}/projects/${slug}` },
    { name: 'Project Highlights', url: pageUrl },
  ])

  const videoSchemas = videos.map((video) => {
    const youtubeId = video.source !== 'upload' && video.youtubeUrl ? extractYouTubeId(video.youtubeUrl) : null
    return buildVideoObjectSchema({
      name: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : undefined),
      ...(video.source === 'upload' ? { contentUrl: video.videoUrl } : {}),
      ...(youtubeId ? { embedUrl: `https://www.youtube.com/embed/${youtubeId}` } : {}),
      uploadDate: video.recordedAt,
      pageUrl,
    })
  })

  const gallerySchema =
    images.length > 0
      ? [buildImageGallerySchema(images.map((img) => ({ url: img.url as string, caption: img.caption })))]
      : []

  return (
    <>
      <JsonLd data={[breadcrumb, ...videoSchemas, ...gallerySchema]} />

      <PageBanner
        title={
          <>
            {name} <span className="text-brand-accent">Project Highlights</span>
          </>
        }
        subtitle={project.location || project.categoryTitle}
      />

      <div className="py-12 lg:py-16 bg-brand-paper min-h-[50vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back goes to the listing, not to /projects/<slug>: visitors reach
              this page from the Videos button on a project card, and for two
              projects the CMS slug is a different spelling from the page they
              were actually on. */}
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-accent hover:text-brand-accent transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to All Projects
          </Link>

          {/* Optional editorial slot. Both fields are optional in Sanity and
              render only when filled, so more copy can be added to this page
              later without touching the code. */}
          {(project.videosPageHeading || project.videosPageIntro) && (
            <div className="mb-10 max-w-3xl">
              {project.videosPageHeading && (
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-ink mb-3">{project.videosPageHeading}</h2>
              )}
              {project.videosPageIntro && (
                <p className="text-brand-muted leading-relaxed whitespace-pre-line">{project.videosPageIntro}</p>
              )}
            </div>
          )}

          {videos.length > 0 || images.length > 0 ? (
            /* The tabs read ?tab= from the URL, which needs a Suspense boundary
               on a statically rendered page. The fallback is the default tab
               rendered on the server, so the static HTML already carries the
               content: search engines and a slow hydrate both see photos or
               videos, never an empty box. */
            <Suspense
              fallback={
                videos.length > 0 ? (
                  <ProjectVideosGrid videos={videos} />
                ) : (
                  <ProjectHighlightImages images={images} projectName={name} />
                )
              }
            >
              <ProjectHighlightsTabs videos={videos} images={images} projectName={name} />
            </Suspense>
          ) : (
            <div className="bg-white border border-brand-border shadow-sm rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-brand-soft rounded-full flex items-center justify-center mx-auto mb-4">
                <Film className="w-8 h-8 text-brand-primary/40" />
              </div>
              <h3 className="text-xl font-bold text-brand-ink mb-2">Highlights Coming Soon</h3>
              <p className="text-brand-muted mb-6">
                We&apos;re preparing site walkthroughs, drone footage and photographs for {name}. In the meantime, our
                team can walk you through the layout directly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={enquiryHref(name)}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm btn-outline"
                >
                  Enquire Now
                </Link>
                <Link
                  href={`/projects/${slug}`}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm btn-outline"
                >
                  View Project
                </Link>
              </div>
            </div>
          )}

          {(videos.length > 0 || images.length > 0) && (
            <div className="mt-12 bg-white border border-brand-border shadow-sm rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-bold text-brand-ink">Want to see {name} in person?</h3>
                <p className="text-sm text-brand-muted mt-1">Book a site visit or ask us anything about the layout.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <Link
                  href={enquiryHref(name)}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm text-center btn-outline"
                >
                  Enquire Now
                </Link>
                <a
                  href={`https://wa.me/919666504405?text=${encodeURIComponent(`Hi Bhuwanta, I just viewed the ${name} project highlights. Please share more details.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 bg-[#25D366] text-white font-semibold rounded-lg hover:opacity-90 transition-all text-sm text-center flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <CtaSection />
    </>
  )
}

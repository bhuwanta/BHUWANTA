import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Film, MessageCircle } from 'lucide-react'
import { sanityFetch, projectVideosBySlugQuery, projectSlugsQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema, buildVideoObjectSchema } from '@/components/seo/JsonLd'
import { PageBanner } from '@/components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { ProjectVideosGrid, type ProjectVideo } from '@/components/ui/ProjectVideosGrid'
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

  const name = project.name.trim()
  const siteUrl = getSiteUrl()
  const videos = withLegacyFallback(project)
  const title = `${name} Videos | Bhuwanta`
  const description =
    project.videosPageIntro?.slice(0, 155) ||
    `Watch ${videos.length > 0 ? `${videos.length} video${videos.length === 1 ? '' : 's'}` : 'videos'} of ${name}${project.location ? ` in ${project.location}` : ''} — site walkthroughs and drone tours from Bhuwanta.`

  const firstThumb = videos.find((v) => v.thumbnailUrl)?.thumbnailUrl || project.images?.[0]

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
  const siteUrl = getSiteUrl()
  const pageUrl = `${siteUrl}/projects/${slug}/videos`

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Projects', url: `${siteUrl}/projects` },
    { name, url: `${siteUrl}/projects/${slug}` },
    { name: 'Videos', url: pageUrl },
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

  return (
    <>
      <JsonLd data={[breadcrumb, ...videoSchemas]} />

      <PageBanner
        title={
          <>
            {name} <span className="text-[#c4a55a]">Videos</span>
          </>
        }
        subtitle={project.location || project.categoryTitle}
      />

      <div className="py-12 lg:py-16 bg-[#f7f8fa] min-h-[50vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back goes to the listing, not to /projects/<slug>: visitors reach
              this page from the Videos button on a project card, and for two
              projects the CMS slug is a different spelling from the page they
              were actually on. */}
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#5a6a82] hover:text-[#c4a55a] transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to All Projects
          </Link>

          {/* Optional editorial slot. Both fields are optional in Sanity and
              render only when filled, so more copy can be added to this page
              later without touching the code. */}
          {(project.videosPageHeading || project.videosPageIntro) && (
            <div className="mb-10 max-w-3xl">
              {project.videosPageHeading && (
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0f1d33] mb-3">{project.videosPageHeading}</h2>
              )}
              {project.videosPageIntro && (
                <p className="text-[#5a6a82] leading-relaxed whitespace-pre-line">{project.videosPageIntro}</p>
              )}
            </div>
          )}

          {videos.length > 0 ? (
            <ProjectVideosGrid videos={videos} fallbackPoster={project.images?.[0]} />
          ) : (
            <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-[#f3f5f8] rounded-full flex items-center justify-center mx-auto mb-4">
                <Film className="w-8 h-8 text-[#1e3a5f]/40" />
              </div>
              <h3 className="text-xl font-bold text-[#0f1d33] mb-2">Videos Coming Soon</h3>
              <p className="text-[#5a6a82] mb-6">
                We&apos;re preparing site walkthroughs and drone footage for {name}. In the meantime, our team can walk
                you through the layout directly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/#book-visit?project=${encodeURIComponent(name)}`}
                  className="w-full sm:w-auto px-6 py-3 gradient-gold text-white font-semibold rounded-lg shadow-lg shadow-[#c4a55a]/20 hover:scale-105 transition-premium text-sm"
                >
                  Enquire Now
                </Link>
                <Link
                  href={`/projects/${slug}`}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-[#c4a55a] text-[#c4a55a] font-semibold rounded-lg hover:bg-[#f7f8fa] transition-premium text-sm"
                >
                  View Project
                </Link>
              </div>
            </div>
          )}

          {videos.length > 0 && (
            <div className="mt-12 bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-bold text-[#0f1d33]">Want to see {name} in person?</h3>
                <p className="text-sm text-[#5a6a82] mt-1">Book a site visit or ask us anything about the layout.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <Link
                  href={`/#book-visit?project=${encodeURIComponent(name)}`}
                  className="w-full sm:w-auto px-6 py-3 gradient-gold text-white font-semibold rounded-lg shadow-lg shadow-[#c4a55a]/20 hover:scale-105 transition-premium text-sm text-center"
                >
                  Enquire Now
                </Link>
                <a
                  href={`https://wa.me/919666504405?text=${encodeURIComponent(`Hi Bhuwanta, I just watched the ${name} videos. Please share more details.`)}`}
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

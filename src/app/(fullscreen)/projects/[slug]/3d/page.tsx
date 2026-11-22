import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { getLayoutProject } from '@/data/projects3d/vianValley'
import { LayoutTwinViewer } from '@/components/3d/layout/LayoutTwinViewer'
import { sanityFetch, projectByNameQuery } from '@/lib/sanity'

// Full-bleed on notched phones; the viewer pads its controls with the safe-area insets
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0f172a',
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const project = getLayoutProject(slug)
  if (!project) return { title: '3D Layout | Bhuwanta' }
  return {
    title: `${project.projectName} - Interactive 3D Layout & Plot Availability | Bhuwanta`,
    description: `Explore the interactive 3D layout of ${project.projectName}, ${project.location}. Find any plot by number and check live availability.`,
  }
}

export default async function Project3DPage({ params }: PageProps) {
  const { slug } = await params
  const base = getLayoutProject(slug)
  if (!base) notFound()

  // Live project record from Sanity: verified map pin, brochure, highlights, photos, approvals
  const sanityProject = await sanityFetch<{
    googleMapsUrl?: string
    brochureUrls?: string[] | null
    projectHighlights?: string[] | null
    images?: string[] | null
    approvalBadge?: string | null
  } | null>({
    query: projectByNameQuery,
    params: { name: base.projectName.toUpperCase() },
    tags: ['projects'],
  }).catch(() => null)

  const project = {
    ...base,
    googleMapsUrl: sanityProject?.googleMapsUrl || base.googleMapsUrl,
    brochureUrls: (sanityProject?.brochureUrls ?? []).filter(Boolean),
    highlights: (sanityProject?.projectHighlights ?? []).filter(Boolean),
    images: (sanityProject?.images ?? []).filter(Boolean),
    approvalBadge: sanityProject?.approvalBadge ?? undefined,
  }

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-slate-950">
      <LayoutTwinViewer project={project} backHref={`/projects/${base.slug}`} />
    </main>
  )
}

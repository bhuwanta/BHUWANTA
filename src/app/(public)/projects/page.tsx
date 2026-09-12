import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/seo'
import { sanityFetch, projectsQuery, projectCategoriesQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema, buildRealEstateListingSchema } from '@/components/seo/JsonLd'
import { PageBanner } from '../../../components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { ProjectsFilterClient } from '@/components/ui/ProjectsFilterClient'
import { getSiteUrl } from '@/lib/site-url'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('projects', 'Our Projects', 'Explore Bhuwanta\'s HMDA-approved, Vastu-aligned plot developments in Hyderabad\'s high-growth corridors.')
}

export const revalidate = 0


interface ProjectEntry {
  name: string
  category?: string
  categoryTitle?: string
  slug?: { current: string }
  location: string
  googleMapsUrl?: string
  plotSizes: string
  images?: string[]
  projectHighlights?: string[]
  brochureUrls?: string[]
  layoutUrls?: string[]
  reraUrls?: string[]
  approvalCertificateLabel?: string
  hmdaDtcpUrls?: string[]
  description: string
  videoCount?: number | null
}

export default async function ProjectsPage() {
  let projects: ProjectEntry[] = []
  let categories: { id: string; title: string; label: string; order?: number }[] = []
  let overviewUrls: string[] | null = null
  let overviewButtonLabel: string | undefined

  try {
    const sanityData = await sanityFetch<{
      pageHeading?: string
      projectEntries?: ProjectEntry[]
      overviewUrls?: string[] | null
      overviewButtonLabel?: string
    }>({
      query: projectsQuery,
      tags: ['projects'],
    })
    const sanityCategories = await sanityFetch<{ id: string; title: string; label: string; order?: number }[]>({
      query: projectCategoriesQuery,
      tags: ['projectCategory'],
    })
    
    if (sanityCategories) categories = sanityCategories.filter((c) => c.title.toLowerCase() !== 'farmlands' && c.label.toLowerCase() !== 'farmlands')
    if (sanityData?.overviewUrls) overviewUrls = sanityData.overviewUrls
    if (sanityData?.overviewButtonLabel) overviewButtonLabel = sanityData.overviewButtonLabel
    if (sanityData?.projectEntries) projects = sanityData.projectEntries.map((p: ProjectEntry) => ({ ...p, description: p.description || '' }))
    if (sanityData?.pageHeading) { /* pageHeading available from CMS if needed */ }
  } catch { /* fallback */ }

  // Fallback project
  if (projects.length === 0) {
    projects = [
      {
        name: '[PROJECT NAME]',
        category: 'warangal-highway',
        location: '[LOCATION], Hyderabad',
        googleMapsUrl: 'https://maps.google.com',
        description: 'Bhuwanta\'s debut development — a carefully planned, Vastu-aligned layout in one of Hyderabad\'s fastest-growing zones. Every plot is HMDA-approved, clearly titled, and ready for construction.',
        plotSizes: '150 sq yd – 300 sq yd',
      }
    ]
  }

  const siteUrl = getSiteUrl()
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Projects', url: `${siteUrl}/projects` },
  ])

  const listingSchemas = projects.map((p) =>
    buildRealEstateListingSchema({
      name: p.name,
      description: p.description || '',
      url: p.slug?.current ? `${siteUrl}/projects/${p.slug.current}` : `${siteUrl}/projects`,
      address: p.location,
    })
  )

  return (
    <>
      <JsonLd data={[breadcrumb, ...listingSchemas]} />

      <PageBanner 
        title={<>Our <span className="text-[#c4a55a]">Projects</span></>}
      />

      <ProjectsFilterClient
        projects={projects}
        categories={categories}
        overviewUrls={overviewUrls}
        overviewButtonLabel={overviewButtonLabel}
      />

      <CtaSection />
    </>
  )
}

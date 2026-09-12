import { Metadata } from 'next'
import Link from 'next/link'
import { Check, Download } from 'lucide-react'
import { sanityFetch, projectByNameQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema, buildRealEstateListingSchema } from '@/components/seo/JsonLd'
import { PageBanner } from '@/components/ui/PageBanner'
import { ProjectDetailActions } from '@/components/ui/ProjectDetailActions'
import { CtaSection } from '@/components/ui/CtaSection'

interface ProjectData {
  name: string
  slug?: { current: string }
  location: string
  googleMapsUrl?: string
  description: string
  images?: string[]
  videoUrl?: string
  videoUrls?: string[]
  youtubeUrl?: string
  youtubeUrls?: string[]
  projectHighlights?: string[]
  brochureUrls?: string[]
  layoutUrls?: string[]
  reraUrls?: string[]
  approvalCertificateLabel?: string
  hmdaDtcpUrls?: string[]
  approvalBadge?: string
  videoCount?: number | null
}

export interface ProjectLandingConfig {
  /** Exact name as stored in Sanity — used for the live data lookup */
  sanityName: string
  /** URL slug this page is served at, e.g. "sv-kanaka-maple-homes" */
  slug: string
  displayName: string
  corridorLabel: string
  h1: React.ReactNode
  opportunityParagraphs: string[]
  locationAdvantages: string[]
  faqs: { question: string; answer: string }[]
  relatedLinks: { href: string; label: string }[]
}

// Shared by each /projects/<slug>/page.tsx so the OG/Twitter image is the
// project's real photo (falls back to the branded /api/og generator when
// no photo is set yet) instead of every project page sharing one generic
// preview image on WhatsApp/social.
export async function buildProjectPageMetadata(
  config: ProjectLandingConfig,
  title: string,
  description: string
): Promise<Metadata> {
  const siteUrl = 'https://bhuwanta.com'
  const pageUrl = `${siteUrl}/projects/${config.slug}`
  const project = await sanityFetch<ProjectData | null>({
    query: projectByNameQuery,
    params: { name: config.sanityName },
    tags: ['projects'],
  }).catch(() => null)

  const ogImage = project?.images?.[0]
    || `${siteUrl}/api/og?title=${encodeURIComponent(config.displayName)}&subtitle=${encodeURIComponent(config.corridorLabel)}`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export async function ProjectLandingTemplate({ config }: { config: ProjectLandingConfig }) {
  // Several Sanity entries have a trailing space in their name field, so an
  // exact match misses them. projectByNameQuery now matches on a name prefix
  // (GROQ has no string::trim), which covers those without a second request.
  const project = await sanityFetch<ProjectData | null>({
    query: projectByNameQuery,
    params: { name: config.sanityName },
    tags: ['projects'],
  }).catch(() => null)

  const siteUrl = 'https://bhuwanta.com'
  const pageUrl = `${siteUrl}/projects/${config.slug}`

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Projects', url: `${siteUrl}/projects` },
    { name: config.displayName, url: pageUrl },
  ])
  const faqSchema = buildFaqSchema(config.faqs)
  const listingSchema = buildRealEstateListingSchema({
    name: config.displayName,
    description: project?.description || config.opportunityParagraphs[0] || '',
    url: pageUrl,
    address: project?.location || config.corridorLabel,
    ...(project?.images?.[0] ? { imageUrl: project.images[0] } : {}),
  })

  return (
    <>
      <JsonLd data={[breadcrumb, faqSchema, listingSchema]} />

      <PageBanner
        title={config.h1}
        subtitle={`${project?.location || config.corridorLabel}${project?.approvalBadge ? ` · ${project.approvalBadge}` : ''}`}
      />

      <section className="py-16 bg-[#f7f8fa]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 md:p-10">
            <ProjectDetailActions
              name={config.displayName}
              images={project?.images}
              videoUrl={project?.videoUrl || project?.videoUrls?.[0]}
              youtubeUrl={project?.youtubeUrl || project?.youtubeUrls?.[0]}
              googleMapsUrl={project?.googleMapsUrl}
              brochureUrls={project?.brochureUrls}
              layoutUrls={project?.layoutUrls}
              reraUrls={project?.reraUrls}
              hmdaDtcpUrls={project?.hmdaDtcpUrls}
              approvalCertificateLabel={project?.approvalCertificateLabel}
              // The videos page resolves projects by their Sanity slug, which
              // for two projects is spelled differently from the folder this
              // page is served at (s-v-kanaka-maple-homes vs sv-kanaka-maple-homes,
              // vian-valley vs vian-vally). Link with the CMS spelling or the
              // link 404s; see B2 in the implementation plan.
              slug={project?.slug?.current || config.slug}
              videoCount={project?.videoCount}
            />

            {/* The Opportunity */}
            <div className="mt-8 pt-8 border-t border-[#e8ecf2]">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">The Opportunity</h2>
              <div className="space-y-4">
                {config.opportunityParagraphs.map((p, i) => (
                  <p key={i} className="text-[#5a6a82] leading-relaxed">{p}</p>
                ))}
              </div>
            </div>

            {/* Approvals */}
            <div className="mt-8 pt-8 border-t border-[#e8ecf2]">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Approvals &amp; Legal Documentation</h2>
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="px-4 py-2 bg-[#c4a55a] text-white rounded-full text-xs font-bold uppercase tracking-wider">
                  {project?.approvalBadge || 'HMDA/DTCP Approved'}
                </span>
              </div>
              {project?.reraUrls && project.reraUrls.length > 0 ? (
                <a
                  href={project.reraUrls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#1e3a5f] hover:text-[#c4a55a] transition-colors"
                >
                  <Download className="w-4 h-4" /> View RERA Certificate
                </a>
              ) : (
                <p className="text-sm text-[#5a6a82]">RERA and approval documents are shared during your consultation.</p>
              )}
            </div>

            {/* Specs / Highlights */}
            {project?.projectHighlights && project.projectHighlights.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 mt-8 pt-8 border-t border-[#e8ecf2] text-sm font-medium text-[#0f1d33]">
                {project.projectHighlights.map((highlight, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#c4a55a] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                    {highlight}
                  </div>
                ))}
              </div>
            )}

            {/* Location advantages */}
            <div className="mt-8 pt-8 border-t border-[#e8ecf2]">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Location Advantages</h2>
              <ul className="space-y-3">
                {config.locationAdvantages.map((adv, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#5a6a82]">
                    <div className="w-4 h-4 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#1e3a5f] stroke-[3]" />
                    </div>
                    {adv}
                  </li>
                ))}
              </ul>
            </div>

            {/* FAQ */}
            <div className="mt-8 pt-8 border-t border-[#e8ecf2]">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Frequently Asked Questions</h2>
              <div className="space-y-5">
                {config.faqs.map((faq, i) => (
                  <div key={i}>
                    <h3 className="font-bold text-[#0f1d33] mb-1">{faq.question}</h3>
                    <p className="text-sm text-[#5a6a82]">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            {config.relatedLinks.length > 0 && (
              <div className="mt-8 pt-8 border-t border-[#e8ecf2] flex flex-wrap gap-x-2 gap-y-1 text-sm text-[#5a6a82]">
                <span>Related:</span>
                {config.relatedLinks.map((link, i) => (
                  <span key={link.href}>
                    <Link href={link.href} className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">{link.label}</Link>
                    {i < config.relatedLinks.length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <CtaSection
        primaryButtonText="Request Investor Pricing"
        primaryButtonLink={`/#book-visit?project=${encodeURIComponent(config.displayName)}`}
      />
    </>
  )
}

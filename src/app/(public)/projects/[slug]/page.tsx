import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'
import { sanityFetch, projectBySlugQuery, projectSlugsQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema, buildRealEstateListingSchema, buildFaqSchema } from '@/components/seo/JsonLd'
import { PageBanner } from '@/components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { ProjectDetailActions } from '@/components/ui/ProjectDetailActions'
import { ContactForm } from '@/components/ui/ContactForm'
import { getSiteUrl } from '@/lib/site-url'
import { displayProjectName, displayProjectPlace, projectPageTitle } from '@/lib/project-links'

interface ProjectDetail {
  name: string
  categoryTitle?: string
  slug: { current: string }
  location: string
  googleMapsUrl?: string
  description: string
  images?: string[]
  videoUrl?: string
  youtubeUrl?: string
  projectHighlights?: string[]
  brochureUrls?: string[]
  layoutUrls?: string[]
  reraUrls?: string[]
  approvalCertificateLabel?: string
  hmdaDtcpUrls?: string[]
  approvalBadge?: string
  videoCount?: number | null
  highlightCount?: number | null
}

// Public Arudra prices are masked; exact pricing is supplied in a personalised quote.
const ARUDRA_MINIMUM_SQUARE_YARDS = 150
const arudraRate = '₹21,XXX'
const arudraBaseValue = '₹32,XX,XXX'

const PROJECT_FAQ_DATA: Record<string, { question: string; answer: string }[]> = {
  'vian-vally': [
    {
      question: 'Where is Vian Valley located?',
      answer: 'Vian Valley is located in Shabad, Telangana, southwest of Hyderabad, one of Hyderabad’s established growth corridors.',
    },
    {
      question: 'Are there open plots for sale in Shabad?',
      answer: 'Yes. Vian Valley offers HMDA approved open plots in Shabad, southwest of Hyderabad, with clear legal documentation and RERA registration.',
    },
    {
      question: 'What is the difference between HMDA and DTCP approval?',
      answer: 'HMDA (Hyderabad Metropolitan Development Authority) approves layouts within the Hyderabad metropolitan region, while DTCP (Directorate of Town and Country Planning) approves layouts elsewhere in Telangana. Both indicate a legally sanctioned layout with proper infrastructure. Vian Valley is HMDA approved.',
    },
  ],
  'sv-kanaka-maple-homes': [
    {
      question: 'Where is S.V. Kanaka Maple Homes located?',
      answer: 'S.V. Kanaka Maple Homes is located on the Warangal Highway, near the Yadagirigutta Temple corridor in Telangana.',
    },
    {
      question: 'Are there open plots for sale near Yadagirigutta on the Warangal Highway?',
      answer: 'Yes. S.V. Kanaka Maple Homes offers DTCP and RERA approved open plots on the Warangal Highway, close to the Yadagirigutta Temple corridor.',
    },
    {
      question: 'What is RERA approval and why does it matter for plot buyers?',
      answer: 'RERA (Real Estate Regulatory Authority) registration means a project’s land title, approvals, and disclosures have been filed with the state regulator, giving buyers legal recourse and transparency. S.V. Kanaka Maple Homes is RERA registered.',
    },
  ],
  'tjr-township': [
    {
      question: 'Where is TJR Township located?',
      answer: 'TJR Township is located at Sangareddy Junction on the Mumbai Highway, near the Regional Ring Road in Telangana.',
    },
    {
      question: 'Are there open plots for sale near the Regional Ring Road in Sangareddy?',
      answer: 'Yes. TJR Township offers HMDA and RERA approved open plots at Sangareddy Junction on the Mumbai Highway, close to the upcoming Regional Ring Road.',
    },
    {
      question: 'Are open plots near the Regional Ring Road a good investment?',
      answer: 'Areas along the Regional Ring Road are seeing significant infrastructure investment, which typically supports long-term appreciation for approved, RERA-registered layouts like TJR Township. As with any investment, verify approvals and consult our team before deciding.',
    },
  ],
  'vaibhav-county': [
    {
      question: 'Where is Vaibhav County located?',
      answer: 'Vaibhav County is located in Sadashivpet, on the Mumbai Highway in Telangana.',
    },
    {
      question: 'Are there open plots for sale in Sadashivpet on the Mumbai Highway?',
      answer: 'Yes. Vaibhav County offers DTCP and RERA approved open plots in Sadashivpet, directly on the Mumbai Highway corridor.',
    },
    {
      question: 'Is it safe for NRIs to buy land in Hyderabad?',
      answer: 'Yes. NRIs can legally purchase residential plots in India under FEMA guidelines. Bhuwanta assists NRI buyers with documentation and the purchase process for projects like Vaibhav County: contact our team via WhatsApp or the enquiry form to get started.',
    },
  ],
}

export const revalidate = 60

export async function generateStaticParams() {
  try {
    const slugs = await sanityFetch<string[]>({ query: projectSlugsQuery, tags: ['projects'] })
    return (slugs || []).map((slug) => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const project = await sanityFetch<ProjectDetail | null>({
    query: projectBySlugQuery,
    params: { slug },
    tags: ['projects'],
  }).catch(() => null)

  if (!project) return { title: 'Project Not Found' }

  const siteUrl = getSiteUrl()
  const name = displayProjectName(project.name)
  const place = displayProjectPlace(project.location)
  const badge = project.approvalBadge?.replace(/\s+/g, ' ').trim()
  const title = {
    absolute: slug === 'arudra'
      ? 'Arudra Plots Near Kothur | Prices & Sizes | Bhuwanta'
      : projectPageTitle(name, project.categoryTitle?.trim() || place),
  }
  const description = slug === 'arudra'
    ? `Arudra villa plots near Kothur, from ${ARUDRA_MINIMUM_SQUARE_YARDS} sq. yd. Indicative rate: ${arudraRate} per sq. yd. Request your personalised quote and site visit.`
    : `${name}: open plots${place ? ` near ${place}` : ''}${badge ? `, ${badge}` : ''}. See plot sizes, approvals and pricing, and book a free site visit.`.slice(0, 160)

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/projects/${slug}` },
    openGraph: {
      title: title.absolute,
      description,
      type: 'website',
      images: [
        {
          url:
            project.images?.[0] ||
            `${siteUrl}/api/og?title=${encodeURIComponent(name)}&subtitle=${encodeURIComponent('Bhuwanta Developers')}`,
        },
      ],
    },
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = await sanityFetch<ProjectDetail | null>({
    query: projectBySlugQuery,
    params: { slug },
    tags: ['projects'],
  }).catch(() => null)

  if (!project) return notFound()

  const siteUrl = getSiteUrl()
  const pageUrl = `${siteUrl}/projects/${slug}`
  const hasInlineEnquiry = slug === 'arudra'

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Projects', url: `${siteUrl}/projects` },
    { name: project.name, url: pageUrl },
  ])

  const listingSchema = buildRealEstateListingSchema({
    name: project.name,
    description: project.description || '',
    url: pageUrl,
    ...(project.images?.[0] ? { imageUrl: project.images[0] } : {}),
    address: project.location,
  })

  const faqItems = [
    {
      question: `Which documents should I review for ${project.name}?`,
      answer: 'Request the applicable layout approval, RERA registration details and title documents for the specific phase and plot. Our team can share available documents for your review.',
    },
    ...(hasInlineEnquiry ? [{
      question: 'What is the price and minimum plot size at Arudra?',
      answer: `The indicative rate is ${arudraRate} per sq. yd., with a minimum plot size of ${ARUDRA_MINIMUM_SQUARE_YARDS} sq. yd. The indicative base plot value is ${arudraBaseValue}. Prices shown are masked. Contact Bhuwanta for an exact personalised written quote, including registration and any other applicable charges.`,
    }] : []),
    ...(PROJECT_FAQ_DATA[slug] || []),
    {
      question: `How do I book a site visit to ${project.name}?`,
      answer: `You can book a free site visit to ${project.name} by filling out the enquiry form on this page, or via WhatsApp, and our team will arrange a convenient time.`,
    },
  ]

  const faqSchema = buildFaqSchema(faqItems)

  return (
    <>
      <JsonLd data={[breadcrumb, listingSchema, faqSchema]} />

      <PageBanner
        title={<>{hasInlineEnquiry ? 'Arudra Exotica Villa Plots' : project.name}</>}
        subtitle={`${hasInlineEnquiry ? 'Near Kothur, Hyderabad' : project.location}${project.approvalBadge ? ` · ${project.approvalBadge}` : ''}`}
      />

      <section className="py-16 bg-brand-paper">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-brand-border shadow-sm rounded-xl p-6 md:p-10">
            {hasInlineEnquiry && (
              <section aria-labelledby="arudra-pricing-title" className="mb-8 rounded-xl border border-brand-gold/40 bg-brand-paper p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted">Plot pricing</p>
                <h2 id="arudra-pricing-title" className="mt-2 text-xl font-bold text-brand-primary sm:text-2xl">Arudra Exotica Villa Plots</h2>
                <dl className="mt-5 grid gap-3 sm:grid-cols-3 sm:gap-5">
                  <div className="flex items-center justify-between gap-3 sm:block">
                    <dt className="text-xs text-brand-muted">Indicative rate per sq. yd.</dt>
                    <dd className="text-xl font-bold text-brand-primary sm:mt-1">{arudraRate}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:block">
                    <dt className="text-xs text-brand-muted">Minimum plot size</dt>
                    <dd className="text-xl font-bold text-brand-primary sm:mt-1">{ARUDRA_MINIMUM_SQUARE_YARDS} <span className="text-sm font-medium">sq. yd.</span></dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:block">
                    <dt className="text-xs text-brand-muted">Indicative base plot value</dt>
                    <dd className="text-xl font-bold text-brand-primary sm:mt-1">{arudraBaseValue}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs leading-relaxed text-brand-muted">Prices shown are indicative and masked. Contact Bhuwanta for the exact price and a personalised written quote, including registration and any other applicable charges.</p>
                <Link href="#book-visit" className="btn-solid mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-5 py-3 text-center text-sm font-semibold sm:w-auto">
                  Request Your Personalised Quote
                </Link>
              </section>
            )}
            <ProjectDetailActions
              name={project.name}
              enquiryLink={hasInlineEnquiry ? '#book-visit' : undefined}
              images={project.images}
              videoUrl={project.videoUrl}
              youtubeUrl={project.youtubeUrl}
              googleMapsUrl={project.googleMapsUrl}
              brochureUrls={project.brochureUrls}
              layoutUrls={project.layoutUrls}
              reraUrls={project.reraUrls}
              hmdaDtcpUrls={project.hmdaDtcpUrls}
              approvalCertificateLabel={project.approvalCertificateLabel}
              slug={slug}
              videoCount={project.videoCount}
              highlightCount={project.highlightCount}
            />

            {hasInlineEnquiry && (
              <section id="book-visit" aria-label="Arudra plot enquiry" className="mt-8 scroll-mt-28 rounded-xl border border-brand-border bg-brand-paper p-5 sm:p-8">
                <p className="mb-4 text-sm text-brand-muted">
                  Arudra villa plots from {ARUDRA_MINIMUM_SQUARE_YARDS} sq. yd. Indicative rate: {arudraRate} per sq. yd. Request your personalised quote with exact pricing, layout details or a site visit.
                </p>
                <ContactForm
                  compact
                  submitLabel="Request Your Quote →"
                  submittingLabel="Sending your enquiry..."
                  initialProject={project.name}
                  projectsList={[{ name: project.name, location: project.location }]}
                />
                <p className="mt-3 text-xs text-brand-muted">Verify your mobile number by OTP to send your enquiry.</p>
              </section>
            )}

            {project.description && (
              <p className="mt-8 text-brand-muted leading-relaxed">{project.description}</p>
            )}

            {project.projectHighlights && project.projectHighlights.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 mt-8 pt-8 border-t border-brand-border text-sm font-medium text-brand-ink">
                {project.projectHighlights.map((highlight, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-brand-gold flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                    {highlight}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-brand-border">
              <h2 className="text-xl font-bold text-brand-primary mb-4">Frequently Asked Questions</h2>
              <div className="space-y-5">
                {faqItems.map((faq, i) => (
                  <div key={i}>
                    <h3 className="font-bold text-brand-ink mb-1">{faq.question}</h3>
                    <p className="text-sm text-brand-muted">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaSection
        primaryButtonLink={hasInlineEnquiry ? '#book-visit' : undefined}
        primaryButtonText={hasInlineEnquiry ? 'Request Your Personalised Quote' : undefined}
      />
    </>
  )
}

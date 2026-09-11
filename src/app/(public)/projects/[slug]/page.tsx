import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'
import { sanityFetch, projectBySlugQuery, projectSlugsQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema, buildRealEstateListingSchema, buildFaqSchema } from '@/components/seo/JsonLd'
import { PageBanner } from '@/components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { ProjectDetailActions } from '@/components/ui/ProjectDetailActions'
import { getSiteUrl } from '@/lib/site-url'

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
}

const PROJECT_FAQ_DATA: Record<string, { question: string; answer: string }[]> = {
  'vian-vally': [
    {
      question: 'Where is Vian Vally located?',
      answer: 'Vian Vally is located in Shabad, Telangana, on the NH-44 Bangalore Highway, one of Hyderabad’s established growth corridors.',
    },
    {
      question: 'Are there open plots for sale in Shabad on the NH-44 highway?',
      answer: 'Yes. Vian Vally offers HMDA approved open plots in Shabad, directly on the NH-44 Bangalore Highway corridor, with clear legal documentation and RERA registration.',
    },
    {
      question: 'What is the difference between HMDA and DTCP approval?',
      answer: 'HMDA (Hyderabad Metropolitan Development Authority) approves layouts within the Hyderabad metropolitan region, while DTCP (Directorate of Town and Country Planning) approves layouts elsewhere in Telangana. Both indicate a legally sanctioned layout with proper infrastructure. Vian Vally is HMDA approved.',
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
      answer: 'Yes. NRIs can legally purchase residential plots in India under FEMA guidelines. Bhuwanta assists NRI buyers with documentation and the purchase process for projects like Vaibhav County — contact our team via WhatsApp or the enquiry form to get started.',
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
  const title = { absolute: `${project.name} — ${project.location} | Bhuwanta Developers` }
  const description = `${project.name} in ${project.location}${project.approvalBadge ? `, ${project.approvalBadge}` : ''}. ${project.description?.slice(0, 130) || 'Explore plot sizes, approvals, and pricing.'}`

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/projects/${slug}` },
    openGraph: {
      title: title.absolute,
      description,
      type: 'website',
      ...(project.images?.[0] ? { images: [{ url: project.images[0] }] } : {}),
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
      question: `Is ${project.name} RERA registered?`,
      answer: `Yes. ${project.name} is ${project.approvalBadge || 'HMDA/DTCP'} approved and RERA registered, with clear legal documentation available for verification.`,
    },
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
        title={<>{project.name}</>}
        subtitle={`${project.location}${project.approvalBadge ? ` · ${project.approvalBadge}` : ''}`}
      />

      <section className="py-16 bg-[#f7f8fa]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 md:p-10">
            <ProjectDetailActions
              name={project.name}
              images={project.images}
              videoUrl={project.videoUrl}
              youtubeUrl={project.youtubeUrl}
              googleMapsUrl={project.googleMapsUrl}
              brochureUrls={project.brochureUrls}
              layoutUrls={project.layoutUrls}
              reraUrls={project.reraUrls}
              hmdaDtcpUrls={project.hmdaDtcpUrls}
              approvalCertificateLabel={project.approvalCertificateLabel}
            />

            {project.description && (
              <p className="mt-8 text-[#5a6a82] leading-relaxed">{project.description}</p>
            )}

            {project.projectHighlights && project.projectHighlights.length > 0 && (
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

            <div className="mt-8 pt-8 border-t border-[#e8ecf2]">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Frequently Asked Questions</h2>
              <div className="space-y-5">
                {faqItems.map((faq, i) => (
                  <div key={i}>
                    <h3 className="font-bold text-[#0f1d33] mb-1">{faq.question}</h3>
                    <p className="text-sm text-[#5a6a82]">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  )
}

import { Metadata } from 'next'
import Link from 'next/link'
import { Check, MapPin, Download } from 'lucide-react'
import { sanityFetch, projectByNameQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema, buildRealEstateListingSchema } from '@/components/seo/JsonLd'
import { ProjectImageCarousel } from '@/components/ui/ProjectImageCarousel'
import { TrustStrip } from '@/components/ui/TrustStrip'
import { TrackedWhatsAppAnchor } from '@/components/ui/TrackedWhatsAppAnchor'

const PROJECT_NAME = 'VIAN VALLY'
const WHATSAPP_NUMBER = '919666504405'

interface ProjectData {
  name: string
  location: string
  googleMapsUrl?: string
  description: string
  images?: string[]
  videoUrl?: string
  youtubeUrl?: string
  projectHighlights?: string[]
  reraUrls?: string[]
  approvalBadge?: string
}

export const revalidate = 60

const PAGE_TITLE = 'Open Plots in Shabad — HMDA & RERA Approved | Bhuwanta'
const PAGE_DESCRIPTION = 'Curated, HMDA & RERA approved open plots in Shabad on the NH-44 Bangalore Highway corridor. Reserve a private consultation — no public pricing.'
const PAGE_URL = 'https://bhuwanta.com/shabad-open-plots'

export async function generateMetadata(): Promise<Metadata> {
  const project = await sanityFetch<ProjectData | null>({
    query: projectByNameQuery,
    params: { name: PROJECT_NAME },
    tags: ['projects'],
  }).catch(() => null)

  const ogImage = project?.images?.[0]
    || `https://bhuwanta.com/api/og?title=${encodeURIComponent('Open Plots in Shabad')}&subtitle=${encodeURIComponent('Vian Vally — HMDA & RERA Approved')}`

  return {
    title: { absolute: PAGE_TITLE },
    description: PAGE_DESCRIPTION,
    alternates: { canonical: PAGE_URL },
    openGraph: {
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: PAGE_URL,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      images: [ogImage],
    },
  }
}

const faqs = [
  {
    question: 'Is Shabad a good place to invest in open plots?',
    answer: 'Shabad sits directly on the NH-44 Bangalore Highway corridor southwest of Hyderabad, making it one of the growth belts benefiting from the highway\'s connectivity to the city and the industrial and infrastructure activity along this route. Vian Vally, Bhuwanta\'s HMDA & RERA approved project in Shabad, is a live, verified entry point into this corridor.',
  },
  {
    question: 'Is Vian Vally HMDA approved?',
    answer: 'Yes, Vian Vally is HMDA approved and RERA registered. The RERA certificate and layout documents are available for review — request them through the enquiry form on this page.',
  },
  {
    question: 'What is the pricing for plots at Vian Vally?',
    answer: 'Bhuwanta offers exclusive investor pricing for Vian Vally that is shared directly during a private consultation rather than published publicly. Enquire through the form or WhatsApp for today\'s rate.',
  },
]

export default async function ShabadOpenPlotsPage() {
  const project = await sanityFetch<ProjectData | null>({
    query: projectByNameQuery,
    params: { name: PROJECT_NAME },
    tags: ['projects'],
  }).catch(() => null)

  const siteUrl = 'https://bhuwanta.com'
  const pageUrl = `${siteUrl}/shabad-open-plots`
  const waMessage = encodeURIComponent('Hi Bhuwanta, I would like to know more about Vian Vally in Shabad and today\'s investor pricing.')
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Open Plots in Shabad', url: pageUrl },
  ])
  const faqSchema = buildFaqSchema(faqs)
  const listingSchema = buildRealEstateListingSchema({
    name: 'Vian Vally — Open Plots in Shabad',
    description: 'HMDA & RERA approved open plots in Shabad, on the NH-44 Bangalore Highway corridor.',
    url: pageUrl,
    address: 'Shabad, Hyderabad',
    ...(project?.images?.[0] ? { imageUrl: project.images[0] } : {}),
  })

  return (
    <>
      <JsonLd data={[breadcrumb, faqSchema, listingSchema]} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#002935] luxury-bg-grid-white pt-32 sm:pt-40 pb-16 sm:pb-20">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#B69A4E]/10 rounded-full blur-[150px]" />
        <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B69A4E]/10 text-[#B69A4E] text-xs font-semibold uppercase tracking-widest border border-[#B69A4E]/20 mb-6">
            <MapPin className="w-3.5 h-3.5" /> Shabad · NH-44 Bangalore Highway Corridor
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
            Exclusive Open Plots in Shabad — <span className="text-[#c4a55a]">HMDA & RERA Approved</span>
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed mb-8">
            Vian Vally is Bhuwanta Developers&apos; curated, investor-grade land asset in Shabad — a growth corridor positioned directly on the NH-44 Bangalore Highway. Reserve a private consultation to review approvals and today&apos;s investor pricing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/#book-visit?project=Vian%20Vally" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 gradient-gold text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              Request Investor Pricing
            </Link>
            <TrackedWhatsAppAnchor href={whatsappUrl} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all">
              Chat With Us on WhatsApp
            </TrackedWhatsAppAnchor>
          </div>
        </div>
      </section>

      <TrustStrip />

      {/* Opportunity */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0f1d33] mb-6">The Opportunity in Shabad</h2>
          <p className="text-[#5a6a82] leading-relaxed mb-6">
            Shabad&apos;s position directly on the NH-44 Bangalore Highway gives it durable connectivity advantages that don&apos;t depend on any single project or developer — it&apos;s a function of geography. For investors looking at Hyderabad&apos;s southwest growth corridor, that connectivity is the underlying thesis: land here benefits from the same highway infrastructure that serves the broader Bangalore Highway belt, independent of short-term market cycles.
          </p>
          <p className="text-[#5a6a82] leading-relaxed">
            Vian Vally is Bhuwanta&apos;s live, HMDA approved and RERA registered project in this corridor — real inventory with clear legal documentation, not a pre-launch concept.
          </p>

          {project?.images && project.images.length > 0 && (
            <div className="mt-10 rounded-2xl overflow-hidden border border-[#e8ecf2] aspect-[16/9] relative bg-[#f3f5f8]">
              <ProjectImageCarousel images={project.images} projectName="Vian Vally" videoUrl={project.videoUrl} youtubeUrl={project.youtubeUrl} />
            </div>
          )}
        </div>
      </section>

      {/* Approvals + Specs */}
      <section className="py-16 bg-[#f7f8fa]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-8">
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-6">Approvals &amp; Legal Documentation</h2>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="px-4 py-2 bg-[#c4a55a] text-white rounded-full text-xs font-bold uppercase tracking-wider">
                {project?.approvalBadge || 'HMDA & RERA Approved'}
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
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i}>
                <h3 className="text-lg font-bold text-[#0f1d33] mb-2">{faq.question}</h3>
                <p className="text-[#5a6a82] leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm text-[#5a6a82]">
            Read more in our{' '}
            <Link href="/blog/open-plots-shabad-hyderabad-hmda-approved-guide" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">
              full guide to open plots in Shabad
            </Link>
            , or see how Shabad compares to nearby{' '}
            <Link href="/blog/shabad-vs-shadnagar-investment-comparison" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">
              Shadnagar
            </Link>
            . For the full project listing, visit{' '}
            <Link href="/projects/vian-vally" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">
              the Vian Vally project page
            </Link>
            . Before you buy anywhere in this corridor, download our free{' '}
            <Link href="/resources/hyderabad-plot-buyer-legal-checklist" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">
              Hyderabad Plot Buyer&apos;s Legal Checklist
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  )
}

import { Metadata } from 'next'
import Link from 'next/link'
import { Check, MapPin, Download, ShieldCheck } from 'lucide-react'
import { sanityFetch, projectByNameQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema, buildRealEstateListingSchema } from '@/components/seo/JsonLd'
import { ProjectImageCarousel } from '@/components/ui/ProjectImageCarousel'
import { TrustStrip } from '@/components/ui/TrustStrip'
import { TrackedWhatsAppAnchor } from '@/components/ui/TrackedWhatsAppAnchor'

const PROJECT_NAME = 'S.V.KANAKA MAPLE HOMES'
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

const PAGE_TITLE = 'Open Plots Near Yadagirigutta — Warangal Highway (NH-163) | Bhuwanta'
const PAGE_DESCRIPTION = 'Curated, DTCP & RERA approved open plots on the Warangal Highway, near Yadagirigutta. Reserve a private consultation — no public pricing.'
const PAGE_URL = 'https://bhuwanta.com/yadagirigutta-open-plots'

export async function generateMetadata(): Promise<Metadata> {
  const project = await sanityFetch<ProjectData | null>({
    query: projectByNameQuery,
    params: { name: PROJECT_NAME },
    tags: ['projects'],
  }).catch(() => null)

  const ogImage = project?.images?.[0]
    || `https://bhuwanta.com/api/og?title=${encodeURIComponent('Open Plots Near Yadagirigutta')}&subtitle=${encodeURIComponent('S.V. Kanaka Maple Homes — DTCP & RERA Approved')}`

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

const connectivityDrivers = [
  'Directly on the Warangal Highway (NH-163), connecting Hyderabad to Warangal',
  'Close to Yadagirigutta — home to the Sri Lakshmi Narasimha Swamy Temple and its ongoing redevelopment and tourism-infrastructure activity',
  'Proximity to Bhongir, the district headquarters town on this corridor',
  'Rail connectivity via Yadagirigutta railway station, on the Hyderabad–Warangal line',
  'Positioned along the northern corridor of the Regional Ring Road (RRR) alignment',
]

const dueDiligenceChecklist = [
  'Confirm DTCP approval on the official Directorate of Town and Country Planning portal — never take a brochure or verbal claim at face value',
  "Verify the project's RERA registration number directly on the TS-RERA website",
  'Ask for a recent Encumbrance Certificate covering a meaningful look-back period',
  'Cross-check the approved layout plan against what is being shown on-site',
  'Do a physical site visit before booking — highway frontage and road access are easy to confirm in person',
]

const faqs = [
  {
    question: 'Is the Yadagirigutta corridor a good place to invest in open plots?',
    answer: 'The Warangal Highway (NH-163) near Yadagirigutta benefits from sustained temple-tourism infrastructure investment around the Sri Lakshmi Narasimha Swamy Temple, proximity to the district headquarters town of Bhongir, rail connectivity via Yadagirigutta station, and the northern alignment of the planned Regional Ring Road (RRR). S.V. Kanaka Maple Homes, Bhuwanta\'s DTCP & RERA approved project on this corridor, is a live, verified entry point.',
  },
  {
    question: 'Is S.V. Kanaka Maple Homes DTCP approved?',
    answer: 'Yes, S.V. Kanaka Maple Homes is DTCP approved and RERA registered. The RERA certificate and layout documents are available for review — request them through the enquiry form on this page.',
  },
  {
    question: 'Why does Yadagirigutta\'s temple corridor matter for land value?',
    answer: 'Yadagirigutta is home to the Sri Lakshmi Narasimha Swamy Temple, which has seen significant temple redevelopment and tourism-infrastructure investment. Growth corridors anchored by major temple towns tend to see sustained visitor traffic and connectivity investment over the long term, independent of any single project — a directional growth factor, not a guarantee.',
  },
  {
    question: 'How is the Yadagirigutta corridor connected to Hyderabad?',
    answer: 'The corridor sits on the Warangal Highway (NH-163), which connects Hyderabad to Warangal, and has rail connectivity via Yadagirigutta railway station. It also lies along the northern alignment of the planned Regional Ring Road (RRR).',
  },
  {
    question: 'What is the pricing for plots at S.V. Kanaka Maple Homes?',
    answer: 'Bhuwanta shares exclusive investor pricing for S.V. Kanaka Maple Homes directly during a private consultation rather than publishing it. Enquire through the form or WhatsApp for today\'s rate.',
  },
  {
    question: 'What should I check before buying a plot near Yadagirigutta?',
    answer: 'At minimum: DTCP or HMDA approval verified on the official government portal, an active RERA registration, a clean Encumbrance Certificate, and a physical site visit to confirm road access and layout accuracy. See our due-diligence checklist below, or our full HMDA vs DTCP guide, before you commit to any plot in this corridor.',
  },
]

export default async function YadagiriguttaOpenPlotsPage() {
  const project = await sanityFetch<ProjectData | null>({
    query: projectByNameQuery,
    params: { name: PROJECT_NAME },
    tags: ['projects'],
  }).catch(() => null)

  const siteUrl = 'https://bhuwanta.com'
  const pageUrl = `${siteUrl}/yadagirigutta-open-plots`
  const waMessage = encodeURIComponent('Hi Bhuwanta, I would like to know more about S.V. Kanaka Maple Homes near Yadagirigutta and today\'s investor pricing.')
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Open Plots Near Yadagirigutta', url: pageUrl },
  ])
  const faqSchema = buildFaqSchema(faqs)
  const listingSchema = buildRealEstateListingSchema({
    name: 'S.V. Kanaka Maple Homes — Open Plots Near Yadagirigutta',
    description: 'DTCP & RERA approved open plots on the Warangal Highway, near Yadagirigutta.',
    url: pageUrl,
    address: 'Warangal Highway, near Yadagirigutta, Telangana',
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
            <MapPin className="w-3.5 h-3.5" /> Warangal Highway, near Yadagirigutta
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
            Exclusive Open Plots Near Yadagirigutta — <span className="text-[#c4a55a]">DTCP & RERA Approved</span>
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed mb-8">
            S.V. Kanaka Maple Homes is Bhuwanta Developers&apos; curated, investor-grade land asset on the Warangal Highway, near the Yadagirigutta temple corridor. Reserve a private consultation to review approvals and today&apos;s investor pricing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/#book-visit?project=S.V.%20Kanaka%20Maple%20Homes" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 gradient-gold text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              Request Investor Pricing
            </Link>
            <TrackedWhatsAppAnchor href={whatsappUrl} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all">
              Chat on WhatsApp
            </TrackedWhatsAppAnchor>
          </div>
        </div>
      </section>

      <TrustStrip />

      {/* Opportunity */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0f1d33] mb-6">The Opportunity Near Yadagirigutta</h2>
          <p className="text-[#5a6a82] leading-relaxed mb-6">
            This corridor sits on the Warangal Highway (NH-163), close to Yadagirigutta — home to the Sri Lakshmi Narasimha Swamy Temple, one of the most significant temple redevelopment and tourism-infrastructure efforts in the region. Growth corridors anchored by major temple towns tend to see sustained visitor traffic and connectivity investment over the long term, independent of any single project. The area also benefits from proximity to Bhongir, the district headquarters town, rail connectivity via Yadagirigutta station, and the northern alignment of the planned Regional Ring Road (RRR).
          </p>
          <p className="text-[#5a6a82] leading-relaxed">
            S.V. Kanaka Maple Homes is Bhuwanta&apos;s live, DTCP approved and RERA registered project in this corridor — real inventory with clear legal documentation, not a pre-launch concept.
          </p>

          {project?.images && project.images.length > 0 && (
            <div className="mt-10 rounded-2xl overflow-hidden border border-[#e8ecf2] aspect-[16/9] relative bg-[#f3f5f8]">
              <ProjectImageCarousel images={project.images} projectName="S.V. Kanaka Maple Homes" videoUrl={project.videoUrl} youtubeUrl={project.youtubeUrl} />
            </div>
          )}
        </div>
      </section>

      {/* Connectivity & Growth Drivers */}
      <section className="py-16 bg-[#f7f8fa]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0f1d33] mb-8">Connectivity &amp; Growth Drivers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
            {connectivityDrivers.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-[#e8ecf2] rounded-xl p-4">
                <div className="w-5 h-5 rounded-full bg-[#c4a55a] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white stroke-[3]" />
                </div>
                <span className="text-sm text-[#0f1d33] font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Approvals + Specs */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-8">
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-6">Approvals &amp; Legal Documentation</h2>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="px-4 py-2 bg-[#c4a55a] text-white rounded-full text-xs font-bold uppercase tracking-wider">
                {project?.approvalBadge || 'DTCP & RERA Approved'}
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

      {/* Due Diligence Checklist */}
      <section className="py-16 bg-[#f7f8fa]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[#1e3a5f] mb-6 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#c4a55a]" /> Before You Buy Near Yadagirigutta
          </h2>
          <ul className="space-y-3">
            {dueDiligenceChecklist.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[#5a6a82]">
                <div className="w-4 h-4 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-[#1e3a5f] stroke-[3]" />
                </div>
                {item}
              </li>
            ))}
          </ul>
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
            For the full project listing, visit{' '}
            <Link href="/projects/sv-kanaka-maple-homes" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">
              the S.V. Kanaka Maple Homes project page
            </Link>
            . See how HMDA and DTCP approvals compare in our{' '}
            <Link href="/hmda-vs-dtcp-plots-hyderabad" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">
              HMDA vs DTCP guide
            </Link>
            , or read our{' '}
            <Link href="/blog/best-areas-open-plots-near-hyderabad-2026" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">
              2026 guide to the best areas for open plots near Hyderabad
            </Link>{' '}
            to see how this corridor compares to Hyderabad&apos;s other growth belts.
          </p>
        </div>
      </section>
    </>
  )
}

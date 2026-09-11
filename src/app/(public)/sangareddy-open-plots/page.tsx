import { Metadata } from 'next'
import Link from 'next/link'
import { Check, MapPin, Download, ShieldCheck } from 'lucide-react'
import { sanityFetch, projectByNameQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema, buildRealEstateListingSchema } from '@/components/seo/JsonLd'
import { ProjectImageCarousel } from '@/components/ui/ProjectImageCarousel'
import { TrustStrip } from '@/components/ui/TrustStrip'
import { TrackedWhatsAppAnchor } from '@/components/ui/TrackedWhatsAppAnchor'

const PROJECT_NAME = 'TJR TownShip'
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

const PAGE_TITLE = 'Open Plots in Sangareddy — Mumbai Highway (NH-65) Corridor | Bhuwanta'
const PAGE_DESCRIPTION = 'Curated, HMDA & RERA approved open plots in Sangareddy on the Mumbai Highway (NH-65) corridor, near the Regional Ring Road. Reserve a private consultation — no public pricing.'
const PAGE_URL = 'https://bhuwanta.com/sangareddy-open-plots'

export async function generateMetadata(): Promise<Metadata> {
  const project = await sanityFetch<ProjectData | null>({
    query: projectByNameQuery,
    params: { name: PROJECT_NAME },
    tags: ['projects'],
  }).catch(() => null)

  const ogImage = project?.images?.[0]
    || `https://bhuwanta.com/api/og?title=${encodeURIComponent('Open Plots in Sangareddy')}&subtitle=${encodeURIComponent('TJR Township — HMDA & RERA Approved')}`

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
  'Six-lane Mumbai Highway (NH-65) running directly through Sangareddy, connecting Hyderabad toward Maharashtra',
  'Sangareddy district headquarters — an established administrative and commercial hub, not a speculative micro-market',
  'Close to the NIMZ (National Investment & Manufacturing Zone) industrial corridor, spanning roughly 12,635 acres between Zaheerabad and Sadashivpet',
  "Nearby education hub — IIT Hyderabad's Kandi campus, GITAM Hyderabad, and Woxsen University",
  'Positioned along the northern alignment of the Regional Ring Road (RRR) corridor',
]

const dueDiligenceChecklist = [
  'Confirm HMDA approval on the official HMDA layout-approval portal — never take a brochure or verbal claim at face value',
  "Verify the project's RERA registration number directly on the TS-RERA website",
  'Ask for a recent Encumbrance Certificate covering a meaningful look-back period',
  'Cross-check the approved layout plan against what is being shown on-site',
  'Do a physical site visit before booking — highway frontage and road access are easy to confirm in person',
]

const faqs = [
  {
    question: 'Is Sangareddy a good place to invest in open plots?',
    answer: 'Sangareddy sits directly on the six-lane Mumbai Highway (NH-65) northwest of Hyderabad and is the headquarters town of Sangareddy district, which gives it durable administrative and commercial activity independent of any single project. The area also sits near the NIMZ industrial corridor and an emerging education hub, and lies along the northern alignment of the Regional Ring Road (RRR). TJR Township, Bhuwanta\'s HMDA & RERA approved project at Sangareddy Junction, is a live, verified entry point into this corridor.',
  },
  {
    question: 'Is TJR Township HMDA approved?',
    answer: 'Yes, TJR Township is HMDA approved and RERA registered. The RERA certificate and layout documents are available for review — request them through the enquiry form on this page.',
  },
  {
    question: 'What is the NIMZ, and how does it relate to Sangareddy?',
    answer: 'NIMZ (National Investment & Manufacturing Zone) is a large industrial corridor spanning roughly 12,635 acres between Zaheerabad and Sadashivpet, both within reach of the Sangareddy district belt. Its presence supports sustained industrial and employment activity along this stretch of the Mumbai Highway, which is a directional growth factor for the wider corridor rather than a guarantee tied to any specific plot.',
  },
  {
    question: 'How is Sangareddy connected to Hyderabad?',
    answer: 'Sangareddy is connected to Hyderabad via the six-lane Mumbai Highway (NH-65), and the corridor also lies along the northern alignment of the planned Regional Ring Road (RRR), which is intended to add further connectivity around Hyderabad\'s outer periphery over time.',
  },
  {
    question: 'What is the pricing for plots at TJR Township?',
    answer: 'Bhuwanta shares exclusive investor pricing for TJR Township directly during a private consultation rather than publishing it. Enquire through the form or WhatsApp for today\'s rate.',
  },
  {
    question: 'What should I check before buying a plot in the Sangareddy corridor?',
    answer: 'At minimum: HMDA or DTCP approval verified on the official government portal, an active RERA registration, a clean Encumbrance Certificate, and a physical site visit to confirm road access and layout accuracy. See our due-diligence checklist below, or our full HMDA vs DTCP guide, before you commit to any plot in this corridor.',
  },
]

export default async function SangareddyOpenPlotsPage() {
  const project = await sanityFetch<ProjectData | null>({
    query: projectByNameQuery,
    params: { name: PROJECT_NAME },
    tags: ['projects'],
  }).catch(() => null)

  const siteUrl = 'https://bhuwanta.com'
  const pageUrl = `${siteUrl}/sangareddy-open-plots`
  const waMessage = encodeURIComponent('Hi Bhuwanta, I would like to know more about TJR Township in Sangareddy and today\'s investor pricing.')
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Open Plots in Sangareddy', url: pageUrl },
  ])
  const faqSchema = buildFaqSchema(faqs)
  const listingSchema = buildRealEstateListingSchema({
    name: 'TJR Township — Open Plots in Sangareddy',
    description: 'HMDA & RERA approved open plots at Sangareddy Junction, on the Mumbai Highway (NH-65) corridor.',
    url: pageUrl,
    address: 'Sangareddy, Telangana',
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
            <MapPin className="w-3.5 h-3.5" /> Sangareddy · Mumbai Highway (NH-65) Corridor
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
            Exclusive Open Plots in Sangareddy — <span className="text-[#c4a55a]">HMDA & RERA Approved</span>
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed mb-8">
            TJR Township is Bhuwanta Developers&apos; curated, investor-grade land asset at Sangareddy Junction — the district headquarters town, positioned directly on the six-lane Mumbai Highway (NH-65). Reserve a private consultation to review approvals and today&apos;s investor pricing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/#book-visit?project=TJR%20Township" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 gradient-gold text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
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
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0f1d33] mb-6">The Opportunity in Sangareddy</h2>
          <p className="text-[#5a6a82] leading-relaxed mb-6">
            Sangareddy&apos;s position on the six-lane Mumbai Highway (NH-65), combined with its status as the headquarters town of Sangareddy district, gives it connectivity and administrative durability that don&apos;t depend on any single project or developer. The corridor also sits near the NIMZ industrial belt and a growing education hub, and lies along the northern alignment of the planned Regional Ring Road (RRR) — a combination of established infrastructure and forward-looking growth drivers.
          </p>
          <p className="text-[#5a6a82] leading-relaxed">
            TJR Township is Bhuwanta&apos;s live, HMDA approved and RERA registered project in this corridor — real inventory with clear legal documentation, not a pre-launch concept.
          </p>

          {project?.images && project.images.length > 0 && (
            <div className="mt-10 rounded-2xl overflow-hidden border border-[#e8ecf2] aspect-[16/9] relative bg-[#f3f5f8]">
              <ProjectImageCarousel images={project.images} projectName="TJR Township" videoUrl={project.videoUrl} youtubeUrl={project.youtubeUrl} />
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

      {/* Due Diligence Checklist */}
      <section className="py-16 bg-[#f7f8fa]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[#1e3a5f] mb-6 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#c4a55a]" /> Before You Buy in the Sangareddy Corridor
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
            <Link href="/projects/tjr-township" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">
              the TJR Township project page
            </Link>
            . See how HMDA and DTCP approvals compare in our{' '}
            <Link href="/hmda-vs-dtcp-plots-hyderabad" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">
              HMDA vs DTCP guide
            </Link>
            , or read our{' '}
            <Link href="/blog/best-areas-open-plots-near-hyderabad-2026" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">
              2026 guide to the best areas for open plots near Hyderabad
            </Link>{' '}
            to see how Sangareddy compares to the other growth corridors around the city.
          </p>
        </div>
      </section>
    </>
  )
}

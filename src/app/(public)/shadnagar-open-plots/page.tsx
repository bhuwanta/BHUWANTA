import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Check } from 'lucide-react'
import { sanityFetch, projectByNameQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd'
import { ProjectImageCarousel } from '@/components/ui/ProjectImageCarousel'
import { TrustStrip } from '@/components/ui/TrustStrip'
import { TrackedWhatsAppAnchor } from '@/components/ui/TrackedWhatsAppAnchor'

const PROJECT_NAME = 'VIAN VALLY'
const WHATSAPP_NUMBER = '919666504405'

interface ProjectData {
  images?: string[]
  videoUrl?: string
  youtubeUrl?: string
  projectHighlights?: string[]
  approvalBadge?: string
}

export const revalidate = 60

const PAGE_TITLE = 'Plots Near Shadnagar, NH-44 Corridor | Bhuwanta'
const PAGE_DESCRIPTION = 'Exploring plots near Shadnagar? See Vian Vally, our HMDA & RERA approved project nearby in Shabad, on the same NH-44 highway corridor.'
const PAGE_URL = 'https://bhuwanta.com/shadnagar-open-plots'

export async function generateMetadata(): Promise<Metadata> {
  const project = await sanityFetch<ProjectData | null>({
    query: projectByNameQuery,
    params: { name: PROJECT_NAME },
    tags: ['projects'],
  }).catch(() => null)

  const ogImage = project?.images?.[0]
    || `https://bhuwanta.com/api/og?title=${encodeURIComponent('Plots Near Shadnagar')}&subtitle=${encodeURIComponent('Nearest verified option: Vian Vally in Shabad')}`

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
    question: 'Does Bhuwanta have plots for sale in Shadnagar itself?',
    answer: 'Not currently. Bhuwanta\'s live, verified project on this corridor is Vian Vally in Shabad — on the same NH-44 Bangalore Highway corridor as Shadnagar. We\'d rather point you to real, approved inventory nearby than list something we don\'t have.',
  },
  {
    question: 'Is Shadnagar a good area to invest in 2026?',
    answer: 'Shadnagar sits on the NH-44 Bangalore Highway corridor southwest of Hyderabad and is part of the same broader growth belt as Shabad. See our comparison of the two towns for a fuller picture before deciding where to invest.',
  },
  {
    question: 'What is the nearest verified, HMDA-approved project to Shadnagar?',
    answer: 'Vian Vally, in Shabad, is Bhuwanta\'s nearest live and HMDA & RERA approved project to Shadnagar, on the same highway corridor.',
  },
]

export default async function ShadnagarOpenPlotsPage() {
  const project = await sanityFetch<ProjectData | null>({
    query: projectByNameQuery,
    params: { name: PROJECT_NAME },
    tags: ['projects'],
  }).catch(() => null)

  const siteUrl = 'https://bhuwanta.com'
  const pageUrl = `${siteUrl}/shadnagar-open-plots`
  const waMessage = encodeURIComponent('Hi Bhuwanta, I was looking at plots near Shadnagar — can you tell me about Vian Vally in Shabad and today\'s investor pricing?')
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Plots Near Shadnagar', url: pageUrl },
  ])
  const faqSchema = buildFaqSchema(faqs)

  return (
    <>
      <JsonLd data={[breadcrumb, faqSchema]} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#002935] luxury-bg-grid-white pt-32 sm:pt-40 pb-16 sm:pb-20">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#B69A4E]/10 rounded-full blur-[150px]" />
        <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B69A4E]/10 text-[#B69A4E] text-xs font-semibold uppercase tracking-widest border border-[#B69A4E]/20 mb-6">
            <MapPin className="w-3.5 h-3.5" /> Shadnagar &amp; NH-44 Corridor
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
            Plots Near Shadnagar / NH-44 — <span className="text-[#c4a55a]">Curated HMDA &amp; DTCP Options</span>
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed mb-8">
            We don&apos;t have live inventory in Shadnagar itself yet. What we do have is Vian Vally — a curated, HMDA &amp; RERA approved land asset in Shabad, on the same NH-44 corridor, with clear legal documentation and real inventory today.
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

      {/* Honest positioning */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0f1d33] mb-6">The Nearest Verified Option to Shadnagar</h2>
          <p className="text-[#5a6a82] leading-relaxed mb-6">
            Shadnagar and Shabad sit on the same NH-44 Bangalore Highway corridor southwest of Hyderabad — part of the same growth belt, sharing the same connectivity advantages. We&apos;d rather be direct about this than stretch the truth: Bhuwanta doesn&apos;t currently have plots for sale in Shadnagar itself. What we do have, close by on the same corridor, is Vian Vally in Shabad — a live, HMDA approved and RERA registered project with real inventory and clear documentation.
          </p>
          <p className="text-[#5a6a82] leading-relaxed">
            If your interest is specifically Shadnagar, we&apos;d encourage you to compare the two towns directly — see our{' '}
            <Link href="/blog/shabad-vs-shadnagar-investment-comparison" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">Shabad vs Shadnagar comparison</Link>{' '}
            and our{' '}
            <Link href="/blog/open-plots-shadnagar-growth-story-2026" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">Shadnagar growth story</Link>{' '}
            — before deciding whether the nearby Shabad corridor works for your goals. You may also find our free{' '}
            <Link href="/resources/nh44-growth-corridor-investment-map" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">NH-44 Growth Corridor Investment Guide</Link>{' '}
            useful before deciding.
          </p>

          {project?.images && project.images.length > 0 && (
            <div className="mt-10 rounded-2xl overflow-hidden border border-[#e8ecf2] aspect-[16/9] relative bg-[#f3f5f8]">
              <ProjectImageCarousel images={project.images} projectName="Vian Vally" videoUrl={project.videoUrl} youtubeUrl={project.youtubeUrl} />
            </div>
          )}

          {project?.projectHighlights && project.projectHighlights.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 mt-10 pt-8 border-t border-[#e8ecf2] text-sm font-medium text-[#0f1d33]">
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
      </section>

      {/* FAQ */}
      <section className="py-16 bg-[#f7f8fa]">
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
        </div>
      </section>
    </>
  )
}

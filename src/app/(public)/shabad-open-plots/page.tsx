import type { Metadata } from 'next'
import Link from 'next/link'
import { cache } from 'react'
import { MapPin, ArrowRight, FileCheck2, IndianRupee, CalendarCheck } from 'lucide-react'
import { sanityFetch, projectByNameQuery } from '@/lib/sanity'
import { getSiteUrl } from '@/lib/site-url'
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema, buildRealEstateListingSchema } from '@/components/seo/JsonLd'
import { ProjectImageCarousel } from '@/components/ui/ProjectImageCarousel'
import { TrackedWhatsAppAnchor } from '@/components/ui/TrackedWhatsAppAnchor'
import { ContactForm } from '@/components/ui/ContactForm'

export const revalidate = 60

interface ProjectData {
  name: string
  images?: string[]
  videoUrl?: string
  youtubeUrl?: string
}

// Same CMS name as the project overview; the old VALLY lookup missed its photos.
const getProject = cache(() => sanityFetch<ProjectData | null>({
  query: projectByNameQuery,
  params: { name: 'VIAN VALLEY' },
  tags: ['projects'],
}).catch(() => null))

const title = 'Open Plots in Shabad from ₹30,XXX/sq. yd. | Bhuwanta'
const description = 'Explore Vian Valley open plots in Shabad from ₹30,XXX per sq. yd. Request a plot-specific quote, layout documents and a site visit with Bhuwanta.'

export async function generateMetadata(): Promise<Metadata> {
  const project = await getProject()
  const url = `${getSiteUrl()}/shabad-open-plots`
  const image = project?.images?.[0] || `${getSiteUrl()}/api/og?title=Open%20Plots%20in%20Shabad&subtitle=Vian%20Valley%20%E2%80%94%20Bhuwanta`
  return {
    title: { absolute: title }, description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', images: [{ url: image }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

const faqs = [
  {
    question: 'What is the price of open plots in Shabad?',
    answer: 'Bhuwanta’s advertised Vian Valley offer starts at ₹30,XXX per square yard. Request a written quote for a specific plot, including its area, facing, phase and applicable charges. A per-yard rate is not the total purchase price.',
  },
  {
    question: 'Where is Vian Valley located?',
    answer: 'Vian Valley is in Shabad, Ranga Reddy district, southwest of Hyderabad. Ask for the exact entrance pin and a route from your starting point when arranging a site visit. Shabad and Shadnagar are distinct locations.',
  },
  {
    question: 'Which plot sizes and phases are available?',
    answer: 'Request the current plot list with plot numbers, dimensions, facing and phase. The master layout includes Vian Valley 1, Vian Valley 2 and Vian Jubilee Central; a combined layout is not a statement of current availability.',
  },
  {
    question: 'How do I check the approvals before buying?',
    answer: 'Request the HMDA layout approval, RERA registration details and title documents for the exact phase and plot. Match the project name, survey numbers and plot number to the documents before proceeding. A brochure badge alone is not a substitute for these checks.',
  },
  {
    question: 'Can I book a site visit with Bhuwanta?',
    answer: 'Yes. Use the enquiry form or WhatsApp to request a site visit. Share your budget and preferred date so the team can confirm suitable plots and the meeting location.',
  },
]

export default async function ShabadOpenPlotsPage() {
  const project = await getProject()
  const siteUrl = getSiteUrl()
  const pageUrl = `${siteUrl}/shabad-open-plots`
  const whatsappUrl = `https://wa.me/919666504405?text=${encodeURIComponent('Hi Bhuwanta, I am interested in Vian Valley plots in Shabad from ₹30,XXX per sq. yd. Please share available plot sizes, the total cost breakdown and site visit options.')}`
  const projects = [{ name: project?.name || 'VIAN VALLEY', location: 'Shabad' }]

  return (
    <>
      <JsonLd data={[
        buildBreadcrumbSchema([{ name: 'Home', url: siteUrl }, { name: 'Open Plots in Shabad', url: pageUrl }]),
        buildFaqSchema(faqs),
        buildRealEstateListingSchema({ name: 'Vian Valley: Open Plots in Shabad', description, url: pageUrl, address: 'Shabad, Ranga Reddy, Telangana', ...(project?.images?.[0] ? { imageUrl: project.images[0] } : {}) }),
      ]} />
      <section className="relative overflow-hidden bg-brand-deep pt-32 sm:pt-40 pb-16 sm:pb-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-[100px]" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <nav aria-label="Breadcrumb" className="text-sm text-white/60 mb-8"><Link href="/" className="hover:text-white">Home</Link><span className="mx-2">/</span>Open Plots in Shabad</nav>
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="flex items-center gap-2 text-brand-accent text-sm font-semibold mb-5"><MapPin className="w-4 h-4" /> Shabad · Southwest Hyderabad</p>
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-5">Open Plots in Shabad.<br /><span className="text-brand-accent">Explore Vian Valley.</span></h1>
              <p className="text-white/75 text-lg leading-relaxed">Explore Shabad’s growing industrial corridor and the developments shaping its future. Compare plot options, review the documents and visit the location with Bhuwanta.</p>
              <div className="mt-7 border-l-2 border-brand-gold pl-5">
                <p className="text-white/70 text-sm">Plots starting from</p>
                <p className="text-3xl font-bold text-brand-accent">₹30,XXX <span className="text-base font-normal text-white/80">per sq. yd.</span></p>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="#book-visit" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl btn-outline">Get Price &amp; Plot Details <ArrowRight className="w-4 h-4" /></Link>
                <TrackedWhatsAppAnchor href={whatsappUrl} className="inline-flex items-center justify-center px-6 py-4 border border-white/25 text-white font-semibold rounded-xl hover:bg-white/10">Ask on WhatsApp</TrackedWhatsAppAnchor>
              </div>
            </div>
            {project?.images?.length ? (
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/10 border border-white/15">
                <ProjectImageCarousel images={project.images} projectName="Vian Valley, Shabad" videoUrl={project.videoUrl} youtubeUrl={project.youtubeUrl} />
              </div>
            ) : (
              <div className="rounded-2xl border border-white/20 p-8 text-white/80"><h2 className="text-xl font-semibold text-white mb-4">Start with the details that matter</h2><p className="leading-relaxed">Ask for available plot numbers, phase-specific documents and a route to the entrance before your visit.</p></div>
            )}
          </div>
        </div>
      </section>
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-7">
          {[
            { icon: IndianRupee, title: 'A quote for your plot', text: 'Compare the rate, plot area and total payable amount. Ask which charges are included before you shortlist.' },
            { icon: FileCheck2, title: 'Documents for your phase', text: 'Request the approved layout, registration details and title documents that match the plot you are considering.' },
            { icon: CalendarCheck, title: 'See the location', text: 'Visit the site to assess access roads, completed amenities and the surroundings for yourself.' },
          ].map(item => <div key={item.title} className="rounded-xl border border-brand-border p-6"><item.icon className="w-6 h-6 text-brand-accent mb-4" /><h2 className="text-lg font-bold text-brand-ink mb-2">{item.title}</h2><p className="text-sm leading-relaxed text-brand-muted">{item.text}</p></div>)}
        </div>
      </section>
      <section className="py-14 bg-brand-paper">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-ink mb-5">Shabad’s wider industrial corridor</h2>
          <p className="text-brand-muted leading-relaxed mb-4">Shabad buyers often compare access to Chandanvelly, Hayathabad and Seetharampur. These are distinct locations: check the route from the particular plot rather than relying on a regional map or a headline travel time.</p>
          <p className="text-brand-muted leading-relaxed mb-4">Olectra reported the start of commercial operations at its Seetharampur EV facility on 31 December 2025. Its first phase has an annual production capacity of 2,500 buses per shift. <a href="https://olectra.com/wp-content/uploads/23.-01.01.2026.pdf" target="_blank" rel="noopener noreferrer" className="underline text-brand-primary">Read Olectra’s announcement</a>.</p>
          <p className="text-brand-muted leading-relaxed">Consider both existing activity and announced plans when comparing locations. Future development does not guarantee a particular resale price or completion date.</p>
          <Link href="/projects/vian-vally" className="inline-flex items-center gap-2 font-semibold text-brand-primary mt-6">View Vian Valley project details <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </section>
      <section id="book-visit" className="py-16 bg-white scroll-mt-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[0.85fr_1.15fr] gap-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-accent mb-3">Your next step</p>
            <h2 className="text-3xl font-bold text-brand-ink mb-5">Find the plot that fits your plans.</h2>
            <p className="text-brand-muted leading-relaxed">Share your requirements to request available plot sizes, a written cost breakdown and a site visit. Whether you are comparing options or ready to visit, our team can help you take the next step.</p>
            <p className="text-sm text-brand-muted mt-5">You can include your budget, preferred plot size and buying timeline in the optional message.</p>
          </div>
          <div className="p-6 sm:p-8 rounded-2xl border border-brand-border bg-brand-paper"><ContactForm projectsList={projects} locationNames={['Shabad']} initialProject={projects[0].name} compact /></div>
        </div>
      </section>
      <section className="py-16 bg-brand-paper">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-brand-ink mb-8">Questions about Shabad plots</h2>
          <div className="space-y-6">{faqs.map(faq => <div key={faq.question}><h3 className="font-bold text-brand-ink mb-2">{faq.question}</h3><p className="text-brand-muted leading-relaxed">{faq.answer}</p></div>)}</div>
          <div className="mt-10 pt-6 border-t border-brand-border flex flex-wrap gap-5 text-sm font-semibold text-brand-primary"><Link href="/blog/open-plots-shabad-hyderabad-hmda-approved-guide">Shabad buyer’s guide</Link><Link href="/blog/shabad-vs-shadnagar-investment-comparison">Shabad vs Shadnagar</Link><Link href="/resources/hyderabad-plot-buyer-legal-checklist">Plot document checklist</Link></div>
        </div>
      </section>
    </>
  )
}

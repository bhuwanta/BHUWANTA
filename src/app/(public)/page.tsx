import { Metadata } from 'next'
import { Suspense } from 'react'
import { PreselectedContactForm } from '@/components/ui/PreselectedContactForm'
import Link from 'next/link'
import {
  ArrowUpRight,
  MapPin,
  FileText,
  CalendarDays,
  Check,
  ShieldCheck,
  Building2,
  FileCheck,
  IndianRupee,
  Compass,
  Hammer,
  BadgeCheck,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { generatePageMetadata } from '@/lib/seo'
import { JsonLd, buildFaqSchema } from '@/components/seo/JsonLd'
import { sanityFetch, projectsQuery, homeQuery } from '@/lib/sanity'
import dynamic from 'next/dynamic'
const ContactForm = dynamic(() =>
  import('@/components/ui/ContactForm').then((module) => module.ContactForm),
)
import { SanityImage } from '@/components/ui/SanityImage'
import { TrustStrip } from '@/components/ui/TrustStrip'
import { ImmersiveHero } from '@/components/ui/ImmersiveHero'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { LazyLeadPopup } from '@/components/ui/LazyLeadPopup'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata(
    'home',
    'HMDA & DTCP Approved Open Plots near Hyderabad',
    'Explore HMDA & DTCP approved open plots near Hyderabad across prime highway corridors. Review verified layout documents and book a free site visit with Bhuwanta.',
  )
}
export const revalidate = 60
interface Project {
  name: string
  categoryTitle?: string
  images?: string[]
}
const whyFeatures: Array<{ icon: LucideIcon; title: string }> = [
  { icon: ShieldCheck, title: 'HMDA Approved Layouts' },
  { icon: Building2, title: 'DTCP Approved Layouts' },
  { icon: FileCheck, title: 'Clear Legal Documentation' },
  { icon: MapPin, title: 'Prime Growth Locations' },
  { icon: IndianRupee, title: 'Transparent Pricing' },
  { icon: Compass, title: 'Vastu-Compliant Planning' },
  { icon: Hammer, title: 'Ready-for-Construction Plots' },
]
const certifications: Array<{ icon: LucideIcon; title: string }> = [
  { icon: ShieldCheck, title: 'HMDA Approved' },
  { icon: Building2, title: 'DTCP Approved' },
  { icon: Check, title: 'YTDA Approved' },
  { icon: BadgeCheck, title: 'RERA Certified' },
  { icon: FileCheck, title: 'Verified Documentation' },
]

const homeFaqs = [
  {
    question: 'Are Bhuwanta\'s open plots HMDA and DTCP approved?',
    answer:
      'Yes. All Bhuwanta layouts are legally verified with approvals from HMDA (Hyderabad Metropolitan Development Authority) or DTCP (Directorate of Town and Country Planning), along with mandatory Telangana RERA certifications and clear, marketable title deeds.',
  },
  {
    question: 'How do I book a free site visit to Bhuwanta project layouts?',
    answer:
      'You can book a free site visit directly using our online enquiry form, by calling our team, or via WhatsApp. Our property advisors arrange guided transportation to the project location, walkthrough of available plot dimensions, and in-person review of layout documentation.',
  },
  {
    question: 'Which highway corridors around Hyderabad offer the best investment appreciation?',
    answer:
      'Key growth corridors include the Mumbai Highway (NH-65) passing through Sangareddy and Sadashivpet (adjacent to NIMZ), the Warangal Highway (NH-163) near Yadagirigutta and AIIMS Bibinagar, and the Bangalore Highway (NH-44) near Kothur and Shadnagar. The upcoming Regional Ring Road (RRR) intersects these corridors, driving exponential long-term capital appreciation.',
  },
  {
    question: 'What documents should I verify before purchasing an open plot in Hyderabad?',
    answer:
      'Before purchasing an open plot, verify the Final Layout Approval LP number from HMDA/DTCP, RERA registration certificate, 30-year Encumbrance Certificate (EC), Title Deed, Revenue Pattadar Passbook, and official layout blueprint to ensure zero legal encumbrances.',
  },
  {
    question: 'Are bank loans available for HMDA and DTCP approved open plots?',
    answer:
      'Yes. Because Bhuwanta projects maintain clear titles and 100% legitimate approvals, our plots are pre-approved for plot purchase and construction loans by leading nationalized and private banks (including SBI, HDFC, ICICI, and LIC Housing Finance).',
  },
  {
    question: 'What plot sizes and facing options are available in Bhuwanta townships?',
    answer:
      'Bhuwanta townships offer a wide variety of vastu-compliant plot sizes ranging from 150 sq. yards to 500+ sq. yards, featuring East, West, North, and premium corner facings with 40-feet and 33-feet wide blacktop roads, underground drainage, and electricity connections.',
  },
]
const locations = [
  {
    name: 'Shabad',
    href: '/shabad-open-plots',
    detail: 'Explore southwest Hyderabad',
    match: 'shabad',
    projectMatch: 'vian',
  },
  {
    name: 'Sangareddy',
    href: '/sangareddy-open-plots',
    detail: 'Explore the Mumbai Highway corridor',
    match: 'sangareddy',
    projectMatch: 'tjr',
  },
  {
    name: 'Sadashivpet',
    href: '/sadashivpet-open-plots',
    detail: 'Discover plots west of Hyderabad',
    match: 'sadashivpet',
    projectMatch: 'vaibhav',
  },
  {
    name: 'Yadagirigutta',
    href: '/yadagirigutta-open-plots',
    detail: 'Explore the Warangal Highway corridor',
    match: 'yadagirigutta',
    projectMatch: 'kanaka',
  },
  // Arudra and RPL County, near Kothur. There is no Kothur landing page yet,
  // so this opens the Projects page on the Bangalore Highway filter.
  {
    name: 'Kothur',
    href: '/projects?category=bangalore-highway',
    detail: 'Explore the Bangalore Highway corridor',
    match: 'bangalore',
    projectMatch: 'arudra',
  },
]
export default async function HomePage() {
  const [data, home] = await Promise.all([
    sanityFetch<{ projectEntries?: Project[] }>({
      query: projectsQuery,
      tags: ['projects'],
    }).catch(() => null),
    sanityFetch<{
      heroImages?: Array<{
        text?: string
        image?: { asset?: { url?: string } }
        asset?: { url?: string }
      }>
    }>({ query: homeQuery, tags: ['home'] }).catch(() => null),
  ])
  // Captions are the content; retain caption-only highlights if an image is missing.
  const highlights = (home?.heroImages || []).flatMap((item) => {
    const title = item.text?.trim()
    if (!title) return []
    return [{ title, image: item.image?.asset?.url || item.asset?.url }]
  })
  const projects = data?.projectEntries || []
  const projectsList = projects
    .filter((p) => p.name)
    .map((p) => ({ name: p.name, location: p.categoryTitle || '' }))
  const locationNames = [
    ...new Set(projectsList.map((p) => p.location).filter(Boolean)),
  ]
  // Ongoing Projects is counted from the live Sanity list: a hand-typed number
  // drifted to "4+" while six projects were published. The other three are
  // marketing figures with no source in the CMS.
  const stats = [
    { label: 'Years of Experience', value: '20+' },
    { label: 'Projects Completed', value: '15' },
    { label: 'Happy Customers', value: '1000+' },
    { label: 'Ongoing Projects', value: `${projectsList.length}+` },
  ]
  return (
    <>
      <ImmersiveHero highlights={highlights} />
      {/* Enquiry popup: opens 2s after every load of the home page. */}
      <LazyLeadPopup projectsList={projectsList} locationNames={locationNames} />
      <TrustStrip />
      <section className="home-stats" aria-label="Bhuwanta in numbers">
        <div className="site-container home-stats-grid">
          {stats.map((stat) => (
            <div key={stat.label}>
              <strong>
                <AnimatedCounter value={stat.value} />
              </strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="home-why" id="why-choose">
        <div className="site-container home-marquee-heading">
          <span className="eyebrow">Why Invest with Us</span>
          <h2>
            Why Invest in Bhuwanta's <em>HMDA &amp; DTCP Approved Layouts?</em>
          </h2>
          <p>
            We go beyond selling plots: we deliver trust, transparency and
            long-term value, with developments planned for secure investment
            and future growth.
          </p>
        </div>
        <Marquee items={whyFeatures} variant="feature" />
      </section>
      <section className="home-section" id="locations">
        <div className="site-container">
          <div className="section-heading is-centered">
            <div>
              <span className="eyebrow">Prime Growth Corridors</span>
              <h2 className="locations-heading">
                Explore Open Plots Across <em>Hyderabad Highway Corridors</em>
              </h2>
            </div>
            <Link className="site-text-link" href="/projects">
              View All Projects <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="location-grid">
            {locations.map((location, index) => {
              const photo = projects.find(
                (p) =>
                  (p.categoryTitle?.toLowerCase().includes(location.match) ||
                    p.name?.toLowerCase().includes(location.projectMatch)) &&
                  p.images?.length,
              )?.images?.[0]
              return (
                <Link
                  href={location.href}
                  key={location.name}
                  className="location-card"
                >
                  <div className={`location-art location-art-${index}`}>
                    {photo ? (
                      <SanityImage
                        src={photo}
                        alt={`Project site in ${location.name}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <>
                        <MapPin size={40} strokeWidth={1} />
                        <span>Explore location</span>
                      </>
                    )}
                    <span className="location-number">0{index + 1}</span>
                  </div>
                  <div className="location-info">
                    <h3>{location.name}</h3>
                    <ArrowUpRight size={20} />
                    <p>{location.detail}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
      <section className="home-principles">
        <div className="site-container section-pin">
          <span className="eyebrow">The Bhuwanta approach</span>
        </div>
        <div className="site-container principles-grid">
          <div>
            <h2>
              A clearer path
              <br />
              to <em>owning land.</em>
            </h2>
            <p>
              Choosing a plot starts with the right information. Our team helps
              you explore the location, understand the project, and review the
              next steps.
            </p>
            <Link href="/why-bhuwanta" className="site-text-link">
              Get to Know Bhuwanta <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="principle-list">
            {[
              {
                icon: MapPin,
                title: 'Start with the location',
                text: 'Compare access roads, surrounding development, and the distance to places that matter to you.',
              },
              {
                icon: FileText,
                title: 'Understand the details',
                text: 'Ask for current availability, plot dimensions, pricing, and project-specific approval documents.',
              },
              {
                icon: CalendarDays,
                title: 'See the site yourself',
                text: 'Book a free visit to walk through the layout and discuss your questions with our team.',
              },
            ].map(({ icon: Icon, title, text }, i) => (
              <div className="principle" key={title}>
                <span className="principle-index">0{i + 1}</span>
                <div>
                  <Icon size={22} strokeWidth={1.3} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategic Growth Corridors Guide */}
      <section className="home-section bg-[#f8fafc] border-y border-[#e8ecf2] py-20" id="corridors-guide">
        <div className="site-container">
          <div className="section-heading is-centered mb-12">
            <div>
              <span className="eyebrow">Strategic Growth Corridors</span>
              <h2 className="locations-heading">
                Hyderabad Highway Growth Corridors: <em>Strategic Investment Guide</em>
              </h2>
            </div>
            <p className="max-w-2xl mx-auto text-brand-muted text-sm sm:text-base leading-relaxed mt-3">
              Strategic real estate investment in Telangana is driven by prime national highway corridors and the transformative 340-km Regional Ring Road (RRR). Explore where capital appreciation is surging for HMDA and DTCP approved open plots.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#e8ecf2] hover:border-brand-gold/60 transition-all hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 text-brand-accent flex items-center justify-center mb-6 font-bold text-lg">
                  01
                </div>
                <h3 className="text-xl font-bold text-brand-ink mb-3">
                  Mumbai Highway (NH-65) · Sangareddy &amp; Sadashivpet
                </h3>
                <p className="text-sm text-brand-muted leading-relaxed mb-4">
                  The primary western economic artery connecting Hyderabad to Pune and Mumbai. Anchor drivers include the 13,000-acre National Investment and Manufacturing Zone (NIMZ) Zaheerabad, IIT Hyderabad at Kandi, and extensive industrial expansion, making DTCP approved plots here a preferred choice for long-term capital appreciation.
                </p>
              </div>
              <Link href="/sadashivpet-open-plots" className="site-text-link mt-4 text-xs font-semibold">
                Explore Sadashivpet Plots <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#e8ecf2] hover:border-brand-gold/60 transition-all hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 text-brand-accent flex items-center justify-center mb-6 font-bold text-lg">
                  02
                </div>
                <h3 className="text-xl font-bold text-brand-ink mb-3">
                  Warangal Highway (NH-163) · Yadagirigutta Corridor
                </h3>
                <p className="text-sm text-brand-muted leading-relaxed mb-4">
                  East Hyderabad&apos;s premier spiritual, educational, and logistics corridor. Driven by the world-class Yadadri Temple development, AIIMS Bibinagar, and a multi-lane expressway from Uppal and Ghatkesar. Open plots along this highway offer rapid infrastructure growth and reliable liquidity.
                </p>
              </div>
              <Link href="/yadagirigutta-open-plots" className="site-text-link mt-4 text-xs font-semibold">
                Explore Yadagirigutta Plots <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#e8ecf2] hover:border-brand-gold/60 transition-all hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 text-brand-accent flex items-center justify-center mb-6 font-bold text-lg">
                  03
                </div>
                <h3 className="text-xl font-bold text-brand-ink mb-3">
                  Bangalore Highway (NH-44) · Kothur &amp; Shadnagar
                </h3>
                <p className="text-sm text-brand-muted leading-relaxed mb-4">
                  The high-velocity southern corridor directly connected to Rajiv Gandhi International Airport (RGIA) Shamshabad. Surrounded by multinational logistics hubs, Amazon Data Center, and upcoming industrial clusters, plots here deliver exceptional connectivity and strong appreciation.
                </p>
              </div>
              <Link href="/projects?category=bangalore-highway" className="site-text-link mt-4 text-xs font-semibold">
                Explore Bangalore Highway Plots <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="home-certifications" id="certifications">
        <div className="site-container home-marquee-heading">
          <span className="eyebrow">Verified &amp; Secure</span>
          <h2>
            Verified <em>HMDA &amp; DTCP Approved Layouts &amp; RERA Certifications</em>
          </h2>
          <p>
            We ensure every project meets the highest standards of legality and
            compliance.
          </p>
        </div>
        <Marquee items={certifications} variant="certification" />
      </section>
      <section className="home-section home-journey">
        <div className="site-container">
          <div className="section-heading is-centered">
            <div>
              <span className="eyebrow">From enquiry to ownership</span>
              <h2>Know what comes next in your plot purchase journey.</h2>
            </div>
          </div>
          <div className="journey-grid">
            {[
              [
                'Explore',
                'Shortlist a location and request current project details.',
              ],
              ['Visit', 'Walk through the site and compare available plots.'],
              [
                'Review',
                'Review pricing, terms, title and approval documents.',
              ],
              [
                'Proceed',
                'Confirm your selection and discuss booking and registration.',
              ],
            ].map(([title, text], i) => (
              <div key={title}>
                <span>0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Frequently Asked Questions */}
      <section className="home-section py-20 bg-white" id="faqs">
        <JsonLd data={buildFaqSchema(homeFaqs)} />
        <div className="site-container">
          <div className="section-heading is-centered mb-12">
            <div>
              <span className="eyebrow">Frequently Asked Questions</span>
              <h2 className="locations-heading">
                Everything You Need to Know About <em>Buying Open Plots</em>
              </h2>
            </div>
            <p className="max-w-2xl mx-auto text-brand-muted text-sm sm:text-base leading-relaxed mt-3">
              Clear answers regarding HMDA &amp; DTCP layout approvals, RERA verification, legal documentation, and arranging free site visits with Bhuwanta.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {homeFaqs.map((faq, i) => (
              <details
                key={faq.question}
                className="group border border-[#e8ecf2] rounded-2xl bg-[#fcfdfd] p-5 sm:p-6 transition-all hover:border-brand-gold/60 open:shadow-xs"
                {...(i === 0 ? { open: true } : {})}
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-bold text-base sm:text-lg text-brand-ink">
                  <span>{faq.question}</span>
                  <span className="w-8 h-8 rounded-full bg-brand-soft group-open:bg-[#1e3a5f] group-open:text-white flex items-center justify-center shrink-0 transition-colors">
                    <ChevronDown className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" />
                  </span>
                </summary>
                <div className="mt-4 pt-4 border-t border-[#e8ecf2]/60 text-sm sm:text-base text-brand-muted leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="home-booking" id="book-visit">
        <div className="site-container section-pin">
          <span className="eyebrow">Book a free site visit</span>
        </div>
        <div className="site-container booking-grid">
          <div>
            <h2>
              Book a Free Site Visit to Our
              <br />
              <em>Open Plot Projects</em>
            </h2>
            <p>
              Tell us what you are looking for. Our team will get in touch to
              discuss the project and arrange your visit.
            </p>
            <ul>
              {[
                'Explore the location and layout',
                'Discuss available plots and current pricing',
                'Request project documents',
              ].map((text) => (
                <li key={text}>
                  <Check size={17} />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="booking-form">
            <h3>Book your visit</h3>
            <p>Share your details to get started.</p>
            {/* The fallback is the same form without a preselected project,
                so nothing shifts when the URL's ?project= is applied. */}
            <Suspense
              fallback={
                <ContactForm projectsList={projectsList} locationNames={locationNames} hideTitle />
              }
            >
              <PreselectedContactForm
                projectsList={projectsList}
                locationNames={locationNames}
                hideTitle
              />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  )
}

// Two identical tracks side by side; the CSS animation slides the pair by
// half its width, so the second track lands exactly where the first began and
// the loop has no visible jump.
function Marquee({
  items,
  variant,
}: {
  items: Array<{ icon: LucideIcon; title: string }>
  variant: 'feature' | 'certification'
}) {
  return (
    <div className={`home-marquee is-${variant}`}>
      <div className="home-marquee-track">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1 || undefined}>
            {items.map(({ icon: Icon, title }) => (
              <li key={title}>
                <span className="home-marquee-icon">
                  <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
                </span>
                {title}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}

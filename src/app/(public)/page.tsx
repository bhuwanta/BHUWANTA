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
  type LucideIcon,
} from 'lucide-react'
import { generatePageMetadata } from '@/lib/seo'
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
    'Open Plots around Hyderabad',
    'Explore Bhuwanta projects in Shabad, Sangareddy, Sadashivpet and Yadagirigutta. Request plot availability, project documents and a free site visit.',
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
          <span className="eyebrow">Why Us</span>
          <h2>
            Why choose <em>Bhuwanta?</em>
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
              <span className="eyebrow">Our locations</span>
              <h2 className="locations-heading">
                Explore the area. <em>Find the right fit.</em>
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
      <section className="home-certifications" id="certifications">
        <div className="site-container home-marquee-heading">
          <span className="eyebrow">Verified &amp; Secure</span>
          <h2>
            Our <em>Certifications &amp; Approvals</em>
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
              <h2>Know what comes next.</h2>
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
      <section className="home-booking" id="book-visit">
        <div className="site-container section-pin">
          <span className="eyebrow">Book a free site visit</span>
        </div>
        <div className="site-container booking-grid">
          <div>
            <h2>
              See the plots.
              <br />
              <em>Ask your questions.</em>
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
                <ContactForm projectsList={projectsList} locationNames={locationNames} />
              }
            >
              <PreselectedContactForm
                projectsList={projectsList}
                locationNames={locationNames}
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

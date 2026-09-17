import { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowUpRight,
  MapPin,
  FileText,
  CalendarDays,
  Check,
} from 'lucide-react'
import { generatePageMetadata } from '@/lib/seo'
import { sanityFetch, projectsQuery } from '@/lib/sanity'
import dynamic from 'next/dynamic'
const ContactForm = dynamic(() =>
  import('@/components/ui/ContactForm').then((module) => module.ContactForm),
)
import { SanityImage } from '@/components/ui/SanityImage'
import { TrustStrip } from '@/components/ui/TrustStrip'
import { ImmersiveHero } from '@/components/ui/ImmersiveHero'

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
]
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const { project: preselectedProject } = await searchParams
  const data = await sanityFetch<{ projectEntries?: Project[] }>({
    query: projectsQuery,
    tags: ['projects'],
  }).catch(() => null)
  const projects = data?.projectEntries || []
  const projectsList = projects
    .filter((p) => p.name)
    .map((p) => ({ name: p.name, location: p.categoryTitle || '' }))
  const locationNames = [
    ...new Set(projectsList.map((p) => p.location).filter(Boolean)),
  ]
  return (
    <>
      <ImmersiveHero />
      <TrustStrip />
      <section className="home-section" id="locations">
        <div className="site-container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Our locations</span>
              <h2>
                Explore the area.
                <br />
                <em>Find the right fit.</em>
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
        <div className="site-container principles-grid">
          <div>
            <span className="eyebrow">The Bhuwanta approach</span>
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
      <section className="home-section">
        <div className="site-container">
          <div className="section-heading">
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
        <div className="site-container booking-grid">
          <div>
            <span className="eyebrow">Book a free site visit</span>
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
            <span className="booking-hours">
              Team availability · Mon–Sat, 10 AM–7 PM
            </span>
          </div>
          <div className="booking-form">
            <h3>Arrange your visit</h3>
            <p>Share your details to get started.</p>
            <ContactForm
              key={preselectedProject || 'general'}
              projectsList={projectsList}
              locationNames={locationNames}
              initialProject={preselectedProject}
            />
          </div>
        </div>
      </section>
    </>
  )
}

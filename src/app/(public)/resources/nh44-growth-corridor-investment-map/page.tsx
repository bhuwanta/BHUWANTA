import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd'
import { PageBanner } from '@/components/ui/PageBanner'
import { GatedResource } from '@/components/ui/GatedResource'
import { CtaSection } from '@/components/ui/CtaSection'
import { buildStaticOgMetadata } from '@/lib/seo'

export const metadata: Metadata = buildStaticOgMetadata({
  title: 'NH-44 Growth Corridor Investment Guide | Bhuwanta',
  description: 'A guide to the NH-44 Bangalore Highway corridor southwest of Hyderabad — key towns, infrastructure drivers, and verified inventory.',
  url: 'https://bhuwanta.com/resources/nh44-growth-corridor-investment-map',
  ogTitle: 'NH-44 Growth Corridor',
  ogSubtitle: 'Free Investment Guide — Shabad & Shadnagar',
})

const waypoints = [
  { name: 'Shabad', note: 'Bhuwanta\'s live, HMDA & RERA approved project — Vian Valley', hasInventory: true },
  { name: 'Shadnagar', note: 'Higher search demand neighboring town; no Bhuwanta inventory yet', hasInventory: false },
  { name: 'Kothur / Balanagar / Kammadanam', note: 'Micro-locations within the broader Shadnagar belt', hasInventory: false },
]

const drivers = [
  {
    title: 'NH-44 Bangalore Highway',
    body: 'The corridor\'s core connectivity asset — a national highway connecting Hyderabad toward Bangalore, running through Shabad and Shadnagar.',
  },
  {
    title: 'Regional Ring Road (RRR)',
    body: 'A Telangana government infrastructure project intended to improve connectivity around Hyderabad\'s outer periphery. Large infrastructure projects like this typically take years to move from announcement to completion — treat it as directional context, not a near-term guarantee.',
  },
  {
    title: 'Microsoft Data Center Investment',
    body: 'Microsoft has publicly announced data center investment in the broader southwest Hyderabad region, which is relevant context for the corridor\'s long-term profile.',
  },
  {
    title: 'Metro Extension Proposals',
    body: 'There has been public discussion of metro extension proposals reaching further into this side of the city. Proposals of this kind can take years to move from discussion to funded construction — treat as a long-term possibility, not a committed timeline.',
  },
]

export default function Nh44CorridorGuidePage() {
  const siteUrl = 'https://bhuwanta.com'
  const pageUrl = `${siteUrl}/resources/nh44-growth-corridor-investment-map`
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'NH-44 Growth Corridor Investment Guide', url: pageUrl },
  ])

  return (
    <>
      <JsonLd data={breadcrumb} />

      <PageBanner
        title={<>NH-44 Growth Corridor <span className="text-brand-accent">Investment Guide</span></>}
        subtitle="Key towns, infrastructure drivers, and where Bhuwanta has verified inventory today"
      />

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <GatedResource
            resourceName="NH-44 Growth Corridor Investment Map"
            teaser="Enter your name and mobile number to unlock the full corridor breakdown — free, no obligation."
          >
            <div className="space-y-12">
              <div>
                <h2 className="text-xl font-bold text-brand-primary mb-6">Corridor Waypoints</h2>
                <div className="space-y-4">
                  {waypoints.map((wp, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-brand-paper border border-brand-border">
                      <MapPin className={`w-5 h-5 shrink-0 mt-0.5 ${wp.hasInventory ? 'text-brand-accent' : 'text-brand-muted'}`} />
                      <div>
                        <p className="font-bold text-brand-ink">{wp.name}</p>
                        <p className="text-sm text-brand-muted">{wp.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-brand-primary mb-6">Infrastructure Drivers</h2>
                <div className="space-y-6">
                  {drivers.map((driver, i) => (
                    <div key={i}>
                      <h3 className="font-bold text-brand-ink mb-1">{driver.title}</h3>
                      <p className="text-sm text-brand-muted leading-relaxed">{driver.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-sm text-brand-muted border-t border-brand-border pt-6">
                This guide reflects publicly available information as of 2026 and is not a guarantee of
                future appreciation. For the live, verified project on this corridor, see{' '}
                <Link href="/projects/vian-vally" className="font-semibold text-brand-primary hover:text-brand-accent">Vian Valley in Shabad</Link>,
                or read the full{' '}
                <Link href="/blog/shabad-vs-shadnagar-investment-comparison" className="font-semibold text-brand-primary hover:text-brand-accent">Shabad vs Shadnagar comparison</Link>.
              </p>
            </div>
          </GatedResource>
        </div>
      </section>

      <CtaSection />
    </>
  )
}

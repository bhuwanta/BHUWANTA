import { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { generatePageMetadata } from '@/lib/seo'
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd'
import { PageBanner } from '@/components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { WhatsAppInlineCta } from '@/components/ui/WhatsAppInlineCta'
import { getSiteUrl } from '@/lib/site-url'
import { sanityFetch, projectsQuery } from '@/lib/sanity'
import { canonicalProjectSlug } from '@/lib/project-links'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata(
    'why-bhuwanta',
    'Why Choose Bhuwanta — Trusted Open Plot Advisor in Telangana & AP',
    'Bhuwanta offers HMDA, DTCP, and RERA-approved open plots across Telangana\'s growth corridors, with full transparency on approvals and no hidden pricing.'
  )
}

const faqs = [
  {
    question: 'Is Bhuwanta a RERA-registered developer?',
    answer: 'Yes. All of Bhuwanta\'s projects are RERA registered, in addition to being HMDA, DTCP, or YTDA approved. RERA certificates are available on request for each project.',
  },
  {
    question: 'How can I verify the HMDA/DTCP approval of a Bhuwanta project?',
    answer: 'Ask us for the specific approval number for the project you\'re considering, then check it independently on the HMDA DPMS portal or the Telangana DTCP records, and confirm RERA registration on the TS-RERA portal. We\'d rather you verify it yourself than take our word for it — see our step-by-step verification guide for exactly how.',
  },
  {
    question: 'How do I contact Bhuwanta for pricing?',
    answer: 'Bhuwanta does not publish prices publicly. Request investor pricing via WhatsApp, a phone call, or the contact form, and our team will walk you through current availability and pricing for the project you\'re interested in.',
  },
]

export const revalidate = 300

interface ProjectEntry {
  name?: string
  slug?: { current?: string }
  categoryTitle?: string
  location?: string
  approvalBadge?: string
}

interface ProjectCard {
  name: string
  href: string
  area: string
  corridor: string
  approval: string
}

// Display names and areas for known projects, keyed by Sanity slug. The CMS
// names are mostly upper case with stray spaces, so these read better; the
// list itself, the corridor and the approval come from Sanity so the count
// and cards stay in step with the Projects page.
const PROJECT_DISPLAY: Record<string, { name: string; area: string }> = {
  'vian-valley': { name: 'Vian Valley', area: 'Shabad, Telangana' },
  's-v-kanaka-maple-homes': { name: 'S.V. Kanaka Maple Homes', area: 'Yadagirigutta, Telangana' },
  'tjr-township': { name: 'TJR Township', area: 'Sangareddy, Telangana' },
  'vaibhav-county': { name: 'Vaibhav County', area: 'Sadashivpet, Telangana' },
  arudra: { name: 'Arudra Exotica Earthstay Villas', area: 'Kothur, Telangana' },
  'rpl-county': { name: 'RPL County', area: 'Kothur, Telangana' },
}

// Used only if Sanity cannot be reached, so the section never renders empty.
const FALLBACK_PROJECTS: ProjectEntry[] = [
  { name: 'Vian Valley', slug: { current: 'vian-valley' }, categoryTitle: 'Shabad', approvalBadge: 'HMDA & RERA' },
  { name: 'S.V. Kanaka Maple Homes', slug: { current: 's-v-kanaka-maple-homes' }, categoryTitle: 'Warangal Highway', approvalBadge: 'DTCP & RERA' },
  { name: 'TJR Township', slug: { current: 'tjr-township' }, categoryTitle: 'Mumbai Highway', approvalBadge: 'HMDA & RERA' },
  { name: 'Vaibhav County', slug: { current: 'vaibhav-county' }, categoryTitle: 'Mumbai Highway', approvalBadge: 'DTCP & RERA' },
  { name: 'Arudra Exotica Earthstay Villas', slug: { current: 'arudra' }, categoryTitle: 'Bangalore Highway', approvalBadge: 'HMDA' },
  { name: 'RPL County', slug: { current: 'rpl-county' }, categoryTitle: 'Bangalore Highway', approvalBadge: 'HMDA & RERA' },
]

const tidy = (value?: string) => (value || '').replace(/\s+/g, ' ').trim()
const titleCase = (value: string) =>
  value.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase())

function formatApproval(badge?: string) {
  const text = tidy(badge)
  if (!text) return 'Approval documents on request'
  return /approved/i.test(text) ? text.replace(/approved/i, 'Approved') : `${text} Approved`
}

function toCard(entry: ProjectEntry): ProjectCard | null {
  const slug = entry.slug?.current
  if (!entry.name || !slug) return null
  const display = PROJECT_DISPLAY[slug]
  return {
    name: display?.name || titleCase(tidy(entry.name)),
    href: `/projects/${canonicalProjectSlug(slug)}`,
    area: display?.area || titleCase(tidy(entry.location)),
    corridor: tidy(entry.categoryTitle),
    approval: formatApproval(entry.approvalBadge),
  }
}

export default async function WhyBhuwantaPage() {
  const data = await sanityFetch<{ projectEntries?: ProjectEntry[] }>({
    query: projectsQuery,
    tags: ['projects'],
  }).catch(() => null)
  const entries = data?.projectEntries?.length ? data.projectEntries : FALLBACK_PROJECTS
  const projects = entries.map(toCard).filter((p): p is ProjectCard => p !== null)
  const corridorCount = new Set(projects.map((p) => p.corridor).filter(Boolean)).size

  const siteUrl = getSiteUrl()
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Why Bhuwanta', url: `${siteUrl}/why-bhuwanta` },
  ])
  const faqSchema = buildFaqSchema(faqs)

  return (
    <>
      <JsonLd data={[breadcrumb, faqSchema]} />

      <PageBanner
        title={<>Why Choose <span className="text-brand-accent">Bhuwanta</span></>}
      />

      <section className="py-16 bg-brand-paper">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-brand-border shadow-sm rounded-xl p-6 md:p-10">
            <h2 className="text-xl font-bold text-brand-primary mb-4">What Bhuwanta Actually Does</h2>
            <p className="text-brand-muted leading-relaxed mb-8">
              Bhuwanta develops and sells HMDA, DTCP, and RERA-approved open plots across {projects.length} projects in
              Telangana&apos;s growth corridors. We&apos;re a plotted-development company, not a broker or
              aggregator — every project listed on this site is one we develop and stand behind directly, with
              approval documentation available on request.
            </p>

            <h2 className="text-xl font-bold text-brand-primary mb-4">Why Approval Status Matters — and How to Check It Yourself</h2>
            <p className="text-brand-muted leading-relaxed mb-4">
              HMDA and DTCP approval confirm a layout was legally sanctioned by the relevant authority; RERA
              registration adds a further layer of regulatory oversight and buyer protection. Rather than just
              asserting we&apos;re approved, here&apos;s how to verify it independently for any project you&apos;re
              considering:
            </p>
            <ul className="space-y-2 mb-4 text-brand-muted">
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" /> Ask for the specific approval number for the exact layout — not a general area claim.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" /> Check HMDA approval via the HMDA DPMS portal, or DTCP approval through Telangana&apos;s DTCP records.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" /> Confirm RERA registration is active on the TS-RERA portal.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" /> Request a recent Encumbrance Certificate before making any payment.</li>
            </ul>
            <p className="text-brand-muted leading-relaxed mb-8">
              For the full walkthrough, see our{' '}
              <Link href="/blog/verify-hmda-dtcp-approval-telangana" className="font-semibold text-brand-primary hover:text-brand-accent">
                step-by-step HMDA/DTCP/RERA verification guide
              </Link>.
            </p>

            <h2 className="text-xl font-bold text-brand-primary mb-4">{projects.length} Projects, {corridorCount} Growth Corridors</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {projects.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="block border border-brand-border rounded-lg p-4 hover:border-brand-gold transition-premium"
                >
                  <h3 className="font-bold text-brand-ink mb-1">{p.name}</h3>
                  <p className="text-sm text-brand-muted">
                    {p.corridor && !p.area.startsWith(p.corridor) ? `${p.area} · ${p.corridor}` : p.area}
                  </p>
                  <p className="text-sm font-semibold text-brand-accent mt-1">{p.approval}</p>
                </Link>
              ))}
            </div>

            <h2 className="text-xl font-bold text-brand-primary mb-4">How the Process Works</h2>
            <ol className="space-y-2 mb-8 text-brand-muted list-decimal list-inside">
              <li>Browse our {projects.length} projects and shortlist the one that fits your budget and location preference.</li>
              <li>Request investor pricing via WhatsApp, phone, or the contact form — we don&apos;t publish prices publicly.</li>
              <li>Review approval documents, RERA certificates, and the layout plan for your shortlisted plot.</li>
              <li>Book a free site visit to see the project in person.</li>
              <li>Complete registration with full documentation support from our team.</li>
            </ol>

            <div className="flex justify-center mb-8">
              <WhatsAppInlineCta context="learning more about why Bhuwanta is a trusted developer in Telangana" label="Ask Us on WhatsApp" />
            </div>

            <div className="pt-8 border-t border-brand-border">
              <h2 className="text-xl font-bold text-brand-primary mb-4">Frequently Asked Questions</h2>
              <div className="space-y-5">
                {faqs.map((faq, i) => (
                  <div key={i}>
                    <h3 className="font-bold text-brand-ink mb-1">{faq.question}</h3>
                    <p className="text-sm text-brand-muted">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-10 text-sm text-brand-muted italic border-t border-brand-border pt-6">
              This page is for general information only and does not constitute legal, tax, or financial advice.
              Real estate values can rise or fall, and past market trends do not guarantee future performance.
              Please consult a qualified financial advisor before making any investment decision.
            </p>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  )
}

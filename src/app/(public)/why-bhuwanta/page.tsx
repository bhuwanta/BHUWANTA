import { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { generatePageMetadata } from '@/lib/seo'
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd'
import { PageBanner } from '@/components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { WhatsAppInlineCta } from '@/components/ui/WhatsAppInlineCta'
import { getSiteUrl } from '@/lib/site-url'

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

const projects = [
  {
    name: 'Vian Vally',
    href: '/projects/vian-vally',
    area: 'Shabad, Telangana',
    corridor: 'NH-44 Bangalore Highway',
    approval: 'HMDA & RERA Approved',
  },
  {
    name: 'S.V. Kanaka Maple Homes',
    href: '/projects/sv-kanaka-maple-homes',
    area: 'Yadagirigutta, Telangana',
    corridor: 'Warangal Highway',
    approval: 'DTCP & RERA Approved',
  },
  {
    name: 'TJR Township',
    href: '/projects/tjr-township',
    area: 'Sangareddy, Telangana',
    corridor: 'Mumbai Highway, near the Regional Ring Road',
    approval: 'HMDA & RERA Approved',
  },
  {
    name: 'Vaibhav County',
    href: '/projects/vaibhav-county',
    area: 'Sadashivpet, Telangana',
    corridor: 'Mumbai Highway',
    approval: 'DTCP & RERA Approved',
  },
]

export default function WhyBhuwantaPage() {
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
        title={<>Why Choose <span className="text-[#c4a55a]">Bhuwanta</span></>}
        subtitle="A Trusted Open Plot Advisor in Telangana"
      />

      <section className="py-16 bg-[#f7f8fa]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 md:p-10">
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">What Bhuwanta Actually Does</h2>
            <p className="text-[#5a6a82] leading-relaxed mb-8">
              Bhuwanta develops and sells HMDA, DTCP, and RERA-approved open plots across four projects in
              Telangana&apos;s growth corridors. We&apos;re a plotted-development company, not a broker or
              aggregator — every project listed on this site is one we develop and stand behind directly, with
              approval documentation available on request.
            </p>

            <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Why Approval Status Matters — and How to Check It Yourself</h2>
            <p className="text-[#5a6a82] leading-relaxed mb-4">
              HMDA and DTCP approval confirm a layout was legally sanctioned by the relevant authority; RERA
              registration adds a further layer of regulatory oversight and buyer protection. Rather than just
              asserting we&apos;re approved, here&apos;s how to verify it independently for any project you&apos;re
              considering:
            </p>
            <ul className="space-y-2 mb-4 text-[#5a6a82]">
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-[#c4a55a] shrink-0 mt-0.5" /> Ask for the specific approval number for the exact layout — not a general area claim.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-[#c4a55a] shrink-0 mt-0.5" /> Check HMDA approval via the HMDA DPMS portal, or DTCP approval through Telangana&apos;s DTCP records.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-[#c4a55a] shrink-0 mt-0.5" /> Confirm RERA registration is active on the TS-RERA portal.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-[#c4a55a] shrink-0 mt-0.5" /> Request a recent Encumbrance Certificate before making any payment.</li>
            </ul>
            <p className="text-[#5a6a82] leading-relaxed mb-8">
              For the full walkthrough, see our{' '}
              <Link href="/blog/verify-hmda-dtcp-approval-telangana" className="font-semibold text-[#1e3a5f] hover:text-[#c4a55a]">
                step-by-step HMDA/DTCP/RERA verification guide
              </Link>.
            </p>

            <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">4 Projects, 4 Growth Corridors</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {projects.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="block border border-[#e8ecf2] rounded-lg p-4 hover:border-[#c4a55a] transition-premium"
                >
                  <h3 className="font-bold text-[#0f1d33] mb-1">{p.name}</h3>
                  <p className="text-sm text-[#5a6a82]">{p.area} · {p.corridor}</p>
                  <p className="text-sm font-semibold text-[#c4a55a] mt-1">{p.approval}</p>
                </Link>
              ))}
            </div>

            <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">How the Process Works</h2>
            <ol className="space-y-2 mb-8 text-[#5a6a82] list-decimal list-inside">
              <li>Browse our 4 projects and shortlist the one that fits your budget and location preference.</li>
              <li>Request investor pricing via WhatsApp, phone, or the contact form — we don&apos;t publish prices publicly.</li>
              <li>Review approval documents, RERA certificates, and the layout plan for your shortlisted plot.</li>
              <li>Book a free site visit to see the project in person.</li>
              <li>Complete registration with full documentation support from our team.</li>
            </ol>

            <div className="flex justify-center mb-8">
              <WhatsAppInlineCta context="learning more about why Bhuwanta is a trusted developer in Telangana" label="Ask Us on WhatsApp" />
            </div>

            <div className="pt-8 border-t border-[#e8ecf2]">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Frequently Asked Questions</h2>
              <div className="space-y-5">
                {faqs.map((faq, i) => (
                  <div key={i}>
                    <h3 className="font-bold text-[#0f1d33] mb-1">{faq.question}</h3>
                    <p className="text-sm text-[#5a6a82]">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-10 text-sm text-[#5a6a82] italic border-t border-[#e8ecf2] pt-6">
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

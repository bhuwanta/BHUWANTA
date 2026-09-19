import { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd'
import { PageBanner } from '@/components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { buildStaticOgMetadata } from '@/lib/seo'

export const metadata: Metadata = buildStaticOgMetadata({
  title: "HMDA vs DTCP Plots in Hyderabad: What's the Difference? (2026) | Bhuwanta",
  description: 'HMDA vs DTCP approved plots in Hyderabad: compare infrastructure, approval process, and appreciation potential before you invest.',
  url: 'https://bhuwanta.com/hmda-vs-dtcp-plots-hyderabad',
  ogTitle: 'HMDA vs DTCP Approved Plots',
  ogSubtitle: 'Complete 2026 Comparison',
})

const faqs = [
  {
    question: 'What is the difference between HMDA and DTCP approved plots?',
    answer: 'HMDA (Hyderabad Metropolitan Development Authority) approves layouts within the Hyderabad metropolitan region, offering stricter infrastructure standards and wider roads. DTCP (Directorate of Town and Country Planning) approves layouts outside HMDA jurisdiction in emerging growth corridors, usually at a more affordable entry price with strong long-term appreciation potential.',
  },
  {
    question: 'Which is a better investment: HMDA or DTCP plots?',
    answer: 'Both are legally valid and bank-loan eligible when RERA registered. Buyers prioritizing immediate infrastructure and faster appreciation typically choose HMDA-approved plots; buyers prioritizing affordability and long-term growth in emerging corridors typically choose DTCP-approved plots.',
  },
  {
    question: 'Are DTCP plots legally safe to buy?',
    answer: 'Yes. DTCP approval is a valid government approval for layouts outside HMDA jurisdiction. Always verify the RERA registration number and DTCP approval certificate for the specific layout before booking.',
  },
]

export default function HmdaVsDtcpPage() {
  const siteUrl = 'https://bhuwanta.com'
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'HMDA vs DTCP Approved Plots', url: `${siteUrl}/hmda-vs-dtcp-plots-hyderabad` },
  ])
  const faqSchema = buildFaqSchema(faqs)

  const comparisonRows = [
    { label: 'Approving Authority', hmda: 'Hyderabad Metropolitan Development Authority', dtcp: 'Directorate of Town and Country Planning' },
    { label: 'Jurisdiction', hmda: 'Within the Hyderabad metropolitan region', dtcp: 'Outside HMDA limits, in emerging growth corridors' },
    { label: 'Infrastructure Standards', hmda: 'Wider roads, stricter civic infrastructure norms', dtcp: 'Developer-provided infrastructure per approved layout' },
    { label: 'Typical Entry Price', hmda: 'Higher', dtcp: 'More affordable' },
    { label: 'Appreciation Profile', hmda: 'Faster near-term appreciation', dtcp: 'Strong long-term appreciation as infrastructure catches up' },
  ]

  return (
    <>
      <JsonLd data={[breadcrumb, faqSchema]} />

      <PageBanner
        title={<>HMDA vs <span className="text-brand-accent">DTCP</span> Approved Plots</>}
        subtitle="A complete 2026 comparison to help you choose the right plot for your investment goals"
      />

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-base sm:text-lg text-brand-muted leading-relaxed mb-12">
            HMDA (Hyderabad Metropolitan Development Authority) approves layouts within the Hyderabad metropolitan region, offering stricter infrastructure standards, wider roads, and typically 10-20% higher resale value. DTCP (Directorate of Town and Country Planning) approves layouts outside HMDA jurisdiction, in emerging growth corridors, usually at a more affordable entry price with strong long-term appreciation potential as infrastructure catches up. Both approvals are legally valid and bank-loan eligible when RERA registered. Buyers prioritizing immediate infrastructure and faster appreciation typically choose HMDA-approved plots; buyers prioritizing affordability and long-term growth in emerging corridors typically choose DTCP-approved plots. Bhuwanta Developers offers both:{' '}
            <Link href="/projects/tjr-township" className="font-semibold text-brand-primary hover:text-brand-accent">TJR Township</Link> (HMDA) at Sangareddy Junction and{' '}
            <Link href="/projects/vaibhav-county" className="font-semibold text-brand-primary hover:text-brand-accent">Vaibhav County</Link> (DTCP) in Sadashivpet, both RERA registered with clear legal documentation. Bhuwanta&apos;s <Link href="/projects/sv-kanaka-maple-homes" className="font-semibold text-brand-primary hover:text-brand-accent">S.V. Kanaka Maple Homes</Link> project (DTCP), on the Warangal Highway near Yadagirigutta, is a third example of the DTCP approval type in practice.
          </p>

          <div className="overflow-x-auto mb-16 rounded-xl border border-brand-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-deep text-white">
                  <th className="p-4 text-left font-semibold">Factor</th>
                  <th className="p-4 text-left font-semibold">HMDA Approved</th>
                  <th className="p-4 text-left font-semibold">DTCP Approved</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-brand-paper'}>
                    <td className="p-4 font-semibold text-brand-ink whitespace-nowrap">{row.label}</td>
                    <td className="p-4 text-brand-muted">{row.hmda}</td>
                    <td className="p-4 text-brand-muted">{row.dtcp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold text-brand-primary mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6 mb-4">
            {faqs.map((faq, i) => (
              <div key={i}>
                <h3 className="text-lg font-bold text-brand-ink mb-2 flex items-start gap-2">
                  <Check className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" /> {faq.question}
                </h3>
                <p className="text-brand-muted leading-relaxed pl-7">{faq.answer}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-sm text-brand-muted">
            See these approval types on the ground in our corridor guides for{' '}
            <Link href="/sangareddy-open-plots" className="font-semibold text-brand-primary hover:text-brand-accent">Sangareddy</Link>,{' '}
            <Link href="/sadashivpet-open-plots" className="font-semibold text-brand-primary hover:text-brand-accent">Sadashivpet</Link>, and{' '}
            <Link href="/yadagirigutta-open-plots" className="font-semibold text-brand-primary hover:text-brand-accent">near Yadagirigutta</Link>, or read our{' '}
            <Link href="/blog/best-areas-open-plots-near-hyderabad-2026" className="font-semibold text-brand-primary hover:text-brand-accent">2026 guide to the best areas for open plots near Hyderabad</Link>{' '}
            for a full corridor-by-corridor comparison.
          </p>
        </div>
      </section>

      <CtaSection />
    </>
  )
}

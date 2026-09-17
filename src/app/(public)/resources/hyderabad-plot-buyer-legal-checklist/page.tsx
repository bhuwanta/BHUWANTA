import { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd'
import { PageBanner } from '@/components/ui/PageBanner'
import { GatedResource } from '@/components/ui/GatedResource'
import { CtaSection } from '@/components/ui/CtaSection'
import { buildStaticOgMetadata } from '@/lib/seo'

export const metadata: Metadata = buildStaticOgMetadata({
  title: "Hyderabad Plot Buyer's Legal Checklist | Bhuwanta",
  description: "A step-by-step legal verification checklist for buying open plots in Hyderabad — HMDA/DTCP approval, RERA registration, and encumbrance certificates.",
  url: 'https://bhuwanta.com/resources/hyderabad-plot-buyer-legal-checklist',
  ogTitle: "Plot Buyer's Legal Checklist",
  ogSubtitle: 'Free 8-Step Verification Guide (2026)',
})

const steps = [
  {
    title: '1. Verify the HMDA or DTCP Approval Number',
    body: 'Every legitimate layout has a specific approval number issued by either the Hyderabad Metropolitan Development Authority (HMDA) or the Directorate of Town and Country Planning (DTCP). Ask the seller for this number directly and cross-check it against the relevant government portal — never accept a verbal assurance that "the area is approved."',
  },
  {
    title: '2. Confirm RERA Registration',
    body: 'Under the Real Estate (Regulation and Development) Act, most residential land projects in Telangana must be registered with Telangana RERA (TS-RERA). Ask for the RERA registration number and verify its status directly on the official TS-RERA portal — not just a certificate photo, which can be outdated or altered.',
  },
  {
    title: '3. Request the Approved Layout Plan',
    body: 'Marketing brochures and renders are not the same as the government-approved layout plan filed with HMDA/DTCP. Ask to see the actual approved plan and confirm the specific plot number and boundaries you\'re being offered match it exactly.',
  },
  {
    title: '4. Obtain an Encumbrance Certificate (EC)',
    body: 'An EC confirms the land is free of legal disputes, unpaid loans, or competing claims for a specified period. Insist on reviewing a recent EC (ideally covering 13-30 years) before making any payment.',
  },
  {
    title: '5. Check the Title Deed Chain',
    body: 'Trace the ownership history (the "link documents") back several transactions to confirm a clear, unbroken chain of title. A lawyer can do this verification for a modest fee — it is money well spent before a land purchase.',
  },
  {
    title: '6. Verify Land Use Classification',
    body: 'Confirm the land is classified for the use you intend (residential open plot) and not agricultural land that hasn\'t been legally converted — buying unconverted agricultural land for residential use carries real legal risk.',
  },
  {
    title: '7. Check for Pending Litigation',
    body: 'Ask whether the land or the developer is currently involved in any civil litigation. A local property lawyer can do a basic litigation search at the relevant court/sub-registrar records.',
  },
  {
    title: '8. Confirm Registration & Stamp Duty Process',
    body: 'Understand the registration process, applicable stamp duty, and registration charges before booking — a transparent developer will walk you through this clearly, not gloss over it.',
  },
]

export default function LegalChecklistPage() {
  const siteUrl = 'https://bhuwanta.com'
  const pageUrl = `${siteUrl}/resources/hyderabad-plot-buyer-legal-checklist`
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: "Hyderabad Plot Buyer's Legal Checklist", url: pageUrl },
  ])

  return (
    <>
      <JsonLd data={breadcrumb} />

      <PageBanner
        title={<>Hyderabad Plot Buyer&apos;s <span className="text-brand-accent">Legal Checklist (2026)</span></>}
        subtitle="The 8-step verification process every serious buyer should follow before purchasing an open plot in Hyderabad"
      />

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <GatedResource
            resourceName="Hyderabad Plot Buyer's Legal Checklist"
            teaser="Enter your name and mobile number to unlock the full 8-step legal verification checklist — free, no obligation."
          >
            <div className="space-y-8">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-brand-accent shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-lg font-bold text-brand-ink mb-1">{step.title}</h2>
                    <p className="text-brand-muted leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-10 text-sm text-brand-muted border-t border-brand-border pt-6">
              This checklist is general guidance, not legal advice. For a specific transaction, consult a
              qualified property lawyer. Bhuwanta Developers provides HMDA/DTCP approval documents and RERA
              certificates for all our own projects on request — happy to walk you through this checklist
              against our own documentation. For the detailed walkthrough of steps 1-4 (which portals to use and
              what to search for), see{' '}
              <Link href="/blog/verify-hmda-dtcp-approval-telangana" className="font-semibold text-brand-primary hover:text-brand-accent">
                How to Verify HMDA/DTCP Approval in Telangana
              </Link>.
            </p>
          </GatedResource>
        </div>
      </section>

      <CtaSection />
    </>
  )
}

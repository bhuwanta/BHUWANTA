import { Metadata } from 'next'
import Link from 'next/link'
import { ArticleLayout } from '@/components/ui/ArticleLayout'
import { buildStaticOgMetadata } from '@/lib/seo'

export const metadata: Metadata = buildStaticOgMetadata({
  title: 'How to Verify HMDA/DTCP Approval in Telangana | Bhuwanta',
  description: 'A step-by-step guide to verifying HMDA/DTCP layout approval and RERA registration in Telangana on the official government portals before you buy.',
  url: 'https://bhuwanta.com/blog/verify-hmda-dtcp-approval-telangana',
  ogTitle: 'How to Verify HMDA/DTCP Approval',
  ogSubtitle: 'Step-by-Step Guide Using Official Telangana Portals',
})

const faqs = [
  {
    question: 'Where can I verify HMDA approval for a layout online?',
    answer: 'HMDA maintains an online Development Permission Management System (DPMS) where approved layouts and their approval details can be searched. Search using the layout name, survey number, or approval reference the seller provides: never accept a verbal claim of approval without checking it against the portal yourself.',
  },
  {
    question: 'Where can I verify DTCP approval in Telangana?',
    answer: 'The Telangana Directorate of Town and Country Planning maintains records of DTCP-approved layouts. Ask the seller for the specific DTCP approval/proceedings number and cross-check it through the department\'s public records or by visiting the relevant DTCP office directly.',
  },
  {
    question: 'Where can I verify RERA registration in Telangana?',
    answer: 'The Telangana RERA (TS-RERA) portal maintains a public, searchable register of registered real estate projects. Search by the project name or RERA registration number and confirm the registration is active, not expired or revoked.',
  },
]

export default function VerifyHmdaDtcpApprovalPage() {
  return (
    <ArticleLayout
      slug="verify-hmda-dtcp-approval-telangana"
      title="How to Verify HMDA/DTCP Approval in Telangana: Step-by-Step (2026)"
      description="A step-by-step guide to verifying HMDA and DTCP layout approval and RERA registration in Telangana using the official government portals, before you buy a plot."
      tag="Buyer Verification"
      publishDate="2026-07-13"
      faqs={faqs}
      whatsappContext="verifying a plot's HMDA/DTCP approval before buying"
      relatedLinks={[
        { href: '/hmda-vs-dtcp-plots-hyderabad', label: 'HMDA vs DTCP Approved Plots in Hyderabad' },
        { href: '/resources/hyderabad-plot-buyer-legal-checklist', label: "Free: Hyderabad Plot Buyer's Legal Checklist" },
        { href: '/projects', label: 'View Bhuwanta\'s Approved Projects' },
      ]}
    >
      <p>
        Every year, buyers across Hyderabad&apos;s growth corridors lose money on land that turns out to have no real
        government approval behind it, sold on the strength of a brochure, a verbal assurance, or a photocopied
        certificate that was never actually checked against an official record. The good news: verifying HMDA or
        DTCP approval and RERA registration in Telangana doesn&apos;t require a lawyer or an insider connection. It
        requires knowing which official portal to check and what to ask for. Here is the process, step by step.
      </p>

      <h2>Step 1: Get the Specific Approval Number: Not a General Area Claim</h2>
      <p>
        Before you check anything online, get the seller to give you the <strong>specific</strong> approval number
        for the exact layout, not a claim that &quot;this whole area is HMDA approved.&quot; Approval is granted
        per layout, not per neighborhood or village. A legitimate seller will have this number readily available;
        reluctance to provide it, or a vague answer, is itself a warning sign.
      </p>

      <h2>Step 2: Verify HMDA Approval via DPMS</h2>
      <p>
        HMDA (Hyderabad Metropolitan Development Authority) processes and tracks layout approvals through its
        online Development Permission Management System (DPMS). Using the approval number or layout name provided
        by the seller, search the DPMS system to confirm the layout is genuinely approved, and that the plot
        numbers being offered fall within that approved layout&apos;s boundaries.
      </p>

      <h2>Step 3: Verify DTCP Approval Through Telangana&apos;s DTCP Records</h2>
      <p>
        If the layout is outside HMDA jurisdiction, it should instead carry DTCP (Directorate of Town and Country
        Planning) approval. Ask for the DTCP proceedings/approval number and verify it through the department&apos;s
        public records, or by visiting the relevant DTCP regional office directly if the online record isn&apos;t
        conclusive. Do not treat a DTCP approval claim as equivalent to HMDA approval, or vice versa: they are
        different authorities with different jurisdictions, and a layout should carry the approval type that
        actually matches its location.
      </p>

      <h2>Step 4: Verify RERA Registration on the TS-RERA Portal</h2>
      <p>
        Separately from HMDA/DTCP approval, most real estate projects in Telangana are required to be registered
        under RERA (the Real Estate Regulation and Development Act). The Telangana RERA (TS-RERA) portal maintains
        a public register of registered projects: search by project name or registration number and confirm the
        registration is current and active, not lapsed or under any regulatory action.
      </p>

      <h2>Step 5: Cross-Check the Approved Layout Plan Against What&apos;s Being Offered</h2>
      <p>
        An approval number confirms the layout as a whole was approved: it doesn&apos;t confirm the specific plot
        you&apos;re being shown matches the approved plan. Request the actual approved layout plan (not a marketing
        render) and check that the plot number, dimensions, and boundaries you&apos;re being offered match it
        exactly.
      </p>

      <h2>Step 6: Get an Encumbrance Certificate Before Paying Anything</h2>
      <p>
        Government approval of the layout and clear title to the specific plot are two different things. An
        Encumbrance Certificate (EC), covering a meaningful period (ideally 13-30 years), confirms the land is free
        of competing claims, disputes, or unpaid loans. Insist on reviewing a recent EC before making any advance
        payment: this step catches problems that layout approval alone won&apos;t reveal.
      </p>

      <h2>Putting It Together</h2>
      <p>
        None of these checks are difficult individually, but skipping any one of them is how buyers end up with
        land they can&apos;t actually build on, resell, or get a loan against. If you want the full checklist in one
        place, including the document requests to make and the red flags to watch for, download our free{' '}
        <Link href="/resources/hyderabad-plot-buyer-legal-checklist">Hyderabad Plot Buyer&apos;s Legal Checklist</Link>.
        Bhuwanta makes HMDA/DTCP approval documents and RERA certificates for our own projects available on
        request: we&apos;d rather you verify everything yourself than take our word for it.
      </p>
    </ArticleLayout>
  )
}

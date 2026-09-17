import { Metadata } from 'next'
import Link from 'next/link'
import { ArticleLayout } from '@/components/ui/ArticleLayout'
import { buildStaticOgMetadata } from '@/lib/seo'
import { sanityFetch, projectByNameQuery } from '@/lib/sanity'

export async function generateMetadata(): Promise<Metadata> {
  const vianVally = await sanityFetch<{ images?: string[] } | null>({
    query: projectByNameQuery,
    params: { name: 'VIAN VALLEY' },
    tags: ['projects'],
  }).catch(() => null)

  return buildStaticOgMetadata({
    title: 'DTCP vs HMDA Plots in Shadnagar: Buyer\'s Guide | Bhuwanta',
    description: 'DTCP vs HMDA approved plots in Shadnagar — what applies where, how to verify either type, and where Bhuwanta\'s nearest verified project fits in.',
    url: 'https://bhuwanta.com/blog/dtcp-vs-hmda-plots-shadnagar-buyer-guide',
    ogTitle: 'DTCP vs HMDA Plots in Shadnagar',
    ogSubtitle: "Complete Buyer's Guide (2026)",
    image: vianVally?.images?.[0],
  })
}

const faqs = [
  {
    question: 'Is Shadnagar under HMDA or DTCP?',
    answer: 'It depends on the specific layout and its location relative to the Hyderabad Metropolitan Development Authority boundary — some layouts in and around Shadnagar are DTCP approved, others may fall under HMDA depending on exact location. Always verify the approval type for the specific layout, not the town as a whole.',
  },
  {
    question: 'Does Bhuwanta have HMDA or DTCP approved plots near Shadnagar?',
    answer: 'Bhuwanta\'s nearest live project to Shadnagar is Vian Valley in Shabad, southwest of Hyderabad, which is HMDA approved and RERA registered.',
  },
]

export default function DtcpVsHmdaShadnagarPage() {
  return (
    <ArticleLayout
      slug="dtcp-vs-hmda-plots-shadnagar-buyer-guide"
      title="DTCP vs HMDA Approved Plots in Shadnagar: Complete Buyer's Guide (2026)"
      description="DTCP vs HMDA approved plots in the Shadnagar area — what applies where, how to verify either approval type, and where Bhuwanta's nearest verified project fits in."
      tag="Shadnagar"
      whatsappContext="plots near Shadnagar and Vian Valley in Shabad"
      publishDate="2026-07-13"
      faqs={faqs}
      relatedLinks={[
        { href: '/hmda-vs-dtcp-plots-hyderabad', label: 'HMDA vs DTCP Approved Plots in Hyderabad (full comparison)' },
        { href: '/shadnagar-open-plots', label: 'Plots Near Shadnagar' },
        { href: '/blog/open-plots-shabad-hyderabad-hmda-approved-guide', label: 'Open Plots in Shabad Guide' },
        { href: '/resources/hyderabad-plot-buyer-legal-checklist', label: "Free: Hyderabad Plot Buyer's Legal Checklist" },
      ]}
    >
      <h2>Quick Definitions: What DTCP and HMDA Actually Approve</h2>
      <p>
        HMDA (Hyderabad Metropolitan Development Authority) approves layouts within the Hyderabad metropolitan
        region, applying stricter infrastructure standards. DTCP (Directorate of Town and Country Planning) approves
        layouts outside HMDA&apos;s jurisdiction, typically in emerging corridors further from the city. Both are
        legally valid, government-issued approvals, and both are bank-loan eligible when the layout is also RERA
        registered. For the full side-by-side comparison — pricing profile, infrastructure standards, and
        appreciation pattern — see our dedicated{' '}
        <Link href="/hmda-vs-dtcp-plots-hyderabad">HMDA vs DTCP Approved Plots in Hyderabad</Link> guide.
      </p>

      <h2>Which Applies Where in the Shadnagar / Shabad Belt</h2>
      <p>
        Shadnagar and the wider region, including Shabad, contain a variety of layouts: some layouts
        fall under DTCP, others under HMDA, depending on the specific parcel&apos;s location relative to the HMDA
        boundary. There is no single blanket answer for &quot;is Shadnagar HMDA or DTCP&quot; — it depends on the exact
        layout. This is exactly why buyers in this belt need to verify approval type per-project rather than
        assuming based on the town name.
      </p>

      <h2>Document Checklist for Verifying Either Approval Type</h2>
      <ul>
        <li>Request the layout&apos;s HMDA or DTCP approval number and verify it against the relevant government portal.</li>
        <li>Confirm RERA registration and check its live status on the Telangana RERA portal.</li>
        <li>Review the approved layout plan against the actual plot boundaries being offered.</li>
        <li>Request an Encumbrance Certificate to confirm clear, dispute-free title.</li>
        <li>For DTCP layouts specifically, confirm what infrastructure (roads, drainage) the developer is contractually committing to versus what already exists.</li>
      </ul>

      <h2>Where Bhuwanta Fits</h2>
      <p>
        Bhuwanta doesn&apos;t currently have inventory in Shadnagar itself. Our nearest live, verified project on this
        corridor is <Link href="/projects/vian-vally">Vian Valley</Link>, in neighboring Shabad — HMDA approved and
        RERA registered, on the same NH-44 highway corridor. If you&apos;re specifically evaluating Shadnagar, see our{' '}
        <Link href="/blog/open-plots-shadnagar-growth-story-2026">Shadnagar growth story guide</Link>{' '}
        alongside this one before deciding.
      </p>
      <p>
        As with everything on this site, we don&apos;t publish plot pricing — reach out through the enquiry form or
        WhatsApp on the{' '}
        <Link href="/shadnagar-open-plots">Shadnagar plots page</Link> to talk to our investment team directly.
      </p>
    </ArticleLayout>
  )
}

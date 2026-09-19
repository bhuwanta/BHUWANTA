import type { Metadata } from 'next'
import { ProjectLandingTemplate, ProjectLandingConfig, buildProjectPageMetadata } from '@/components/ui/ProjectLandingTemplate'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return buildProjectPageMetadata(config,
    'Vian Valley Plots in Shabad from ₹30,999/sq. yd. | Bhuwanta',
    'Explore Vian Valley in Shabad with Bhuwanta. Plots from ₹30,999 per sq. yd. Request current plot options, phase-specific documents and a site visit.'
  )
}

const config: ProjectLandingConfig = {
  sanityName: 'VIAN VALLEY',
  // Preserve the established URL; the correctly-spelled alias redirects here.
  slug: 'vian-vally',
  displayName: 'Vian Valley',
  corridorLabel: 'Shabad · Southwest Hyderabad',
  h1: <>Vian Valley</>,
  opportunityParagraphs: [
    'Explore Vian Valley open plots in Shabad, Ranga Reddy district, with Bhuwanta. The advertised offer starts at ₹30,999 per square yard. Request the current plot list and a written quote for the size, facing and phase you prefer.',
    'The master layout includes Vian Valley 1, Vian Valley 2 and Vian Jubilee Central. Confirm the exact phase, approval documents and plot availability before choosing. A site visit helps you assess the access roads and completed amenities.',
  ],
  locationAdvantages: [
    'Located in Shabad, southwest of Hyderabad',
    'Explore the wider Shabad–Chandanvelly industrial corridor',
    'Request the exact entrance pin and a route from your starting point',
  ],
  faqs: [
    {
      question: 'What is the price of Vian Valley plots?',
      answer: 'Bhuwanta’s advertised offer starts at ₹30,999 per square yard. Request a plot-specific quote with dimensions, facing, phase and a breakdown of applicable charges.',
    },
    {
      question: 'How can I review the approvals?',
      answer: 'Request the approved layout, HMDA approval details, RERA registration and title documents for the exact phase and plot you are considering. Match these details before proceeding.',
    },
    {
      question: 'Is Vian Valley in Shabad or Shadnagar?',
      answer: 'Vian Valley is in Shabad. Shabad and Shadnagar are separate locations; ask the team for the project entrance pin before your site visit.',
    },
  ],
  relatedLinks: [
    { href: '/shabad-open-plots', label: 'Shabad prices and site visits' },
    { href: '/projects', label: 'All Projects' },
    { href: '/blog/open-plots-shabad-hyderabad-hmda-approved-guide', label: 'Shabad Buyer’s Guide' },
    { href: '/blog/shabad-vs-shadnagar-investment-comparison', label: 'Shabad vs Shadnagar' },
  ],
}

export default function VianValleyPage() {
  return <ProjectLandingTemplate config={config} />
}

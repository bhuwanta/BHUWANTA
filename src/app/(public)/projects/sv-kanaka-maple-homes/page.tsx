import { Metadata } from 'next'
import { ProjectLandingTemplate, ProjectLandingConfig, buildProjectPageMetadata } from '@/components/ui/ProjectLandingTemplate'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return buildProjectPageMetadata(
    config,
    'S.V. Kanaka Maple Homes near Yadagirigutta | Bhuwanta',
    'Explore S.V. Kanaka Maple Homes in Mallapur village near Yadagirigutta. Request plot prices, the layout, project documents and a site visit.'
  )
}

const config: ProjectLandingConfig = {
  sanityName: 'S.V.KANAKA MAPLE HOMES',
  slug: 'sv-kanaka-maple-homes',
  displayName: 'S.V. Kanaka Maple Homes',
  corridorLabel: 'Mallapur village · Near Yadagirigutta',
  h1: <>S.V. Kanaka Maple Homes</>,
  opportunityParagraphs: [
    'S.V. Kanaka Maple Homes is an open-plot project in Mallapur village, near the Yadagirigutta temple corridor. Explore the layout and request the project entrance pin to understand the location and access route.',
    'Share your preferred plot size, facing and budget with Bhuwanta to request current options and a written quote. Review the documents for your shortlisted plot and arrange a site visit to see the access roads and development on the ground.',
  ],
  locationAdvantages: [
    'Located in Mallapur village near the Yadagirigutta temple corridor',
    'Request the entrance pin and route details for travel from Hyderabad',
    'Visit the project to assess road access, surroundings and on-site development',
  ],
  faqs: [
    {
      question: 'Where is S.V. Kanaka Maple Homes located?',
      answer: 'S.V. Kanaka Maple Homes is in Mallapur village near the Yadagirigutta temple corridor. Request the exact project entrance pin and route before planning your visit.',
    },
    {
      question: 'How can I review the project approvals and layout?',
      answer: 'Request the project-specific layout approval, applicable RERA registration details and title documents for the plot you are considering. Ask the team to identify the plot number and dimensions on the layout.',
    },
    {
      question: 'What is the pricing for plots at S.V. Kanaka Maple Homes?',
      answer: 'Request current plot options and a written quote from Bhuwanta. Ask for the plot number, dimensions, facing and a breakdown of applicable charges so you can compare the total cost.',
    },
    {
      question: 'How do I arrange a site visit?',
      answer: 'Enquire through the form or WhatsApp with your preferred day and starting location. The team can confirm the visit schedule, meeting point and project entrance pin.',
    },
  ],
  relatedLinks: [
    { href: '/yadagirigutta-open-plots', label: 'Plots near Yadagirigutta' },
    { href: '/projects', label: 'All projects' },
    { href: '/hmda-vs-dtcp-plots-hyderabad', label: 'Understanding HMDA and DTCP approvals' },
  ],
}

export default function SVKanakaMapleHomesPage() {
  return <ProjectLandingTemplate config={config} />
}

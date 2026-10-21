import { Metadata } from 'next'
import { ProjectLandingTemplate, ProjectLandingConfig, buildProjectPageMetadata } from '@/components/ui/ProjectLandingTemplate'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return buildProjectPageMetadata(
    config,
    'TJR Township Plots at Sangareddy Junction | Bhuwanta',
    'Explore TJR Township open plots at Sangareddy Junction. Request current prices, the project layout, approval documents and a site visit with Bhuwanta.'
  )
}

const config: ProjectLandingConfig = {
  sanityName: 'TJR TownShip',
  slug: 'tjr-township',
  displayName: 'TJR Township',
  corridorLabel: 'Sangareddy Junction · Mumbai Highway corridor',
  h1: <>TJR Township</>,
  opportunityParagraphs: [
    'Explore TJR Township open plots at Sangareddy Junction in the Mumbai Highway corridor. Request the project layout and entrance pin to compare the location, access roads and plot options.',
    'Tell Bhuwanta your preferred size, facing and budget to request a shortlist and a written quote. Review the documents for the exact plot, then arrange a site visit to assess the layout and completed development.',
  ],
  locationAdvantages: [
    'Located at Sangareddy Junction in the Mumbai Highway corridor',
    'Request the exact entrance pin and directions from your starting point',
    'Assess access roads and the surrounding area during your site visit',
  ],
  faqs: [
    {
      question: 'Where is TJR Township located?',
      answer: 'TJR Township is at Sangareddy Junction in the Mumbai Highway corridor. Request the project entrance pin and route details to plan your visit.',
    },
    {
      question: 'How can I review the project approvals?',
      answer: 'Request the project-specific layout approval, applicable RERA registration details and title documents for your shortlisted plot. Match the plot number and dimensions to the layout before proceeding.',
    },
    {
      question: 'What is the pricing for plots at TJR Township?',
      answer: 'Contact Bhuwanta for current plot options and a written quote. Ask for the plot number, size, facing, quoted rate and a breakdown of applicable charges.',
    },
    {
      question: 'Can I review the layout before a site visit?',
      answer: 'Request the layout through the enquiry form or WhatsApp and share your preferred size and budget. Ask the team to confirm current availability for shortlisted plot numbers and arrange a visit.',
    },
  ],
  relatedLinks: [
    { href: '/sangareddy-open-plots', label: 'Plots in Sangareddy' },
    { href: '/projects', label: 'All projects' },
    { href: '/hmda-vs-dtcp-plots-hyderabad', label: 'Understanding HMDA and DTCP approvals' },
    { href: '/projects/vaibhav-county', label: 'Vaibhav County in Sadashivpet' },
  ],
}

export default function TjrTownshipPage() {
  return <ProjectLandingTemplate config={config} />
}

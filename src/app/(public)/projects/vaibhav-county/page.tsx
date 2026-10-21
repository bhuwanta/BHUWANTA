import { Metadata } from 'next'
import { ProjectLandingTemplate, ProjectLandingConfig, buildProjectPageMetadata } from '@/components/ui/ProjectLandingTemplate'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return buildProjectPageMetadata(
    config,
    'Vaibhav County Plots in Sadashivpet | Bhuwanta',
    'Explore Vaibhav County open plots in Sadashivpet. Request current plot prices, the project layout, approval documents and a site visit with Bhuwanta.'
  )
}

const config: ProjectLandingConfig = {
  sanityName: 'VAIBHAV COUNTY',
  slug: 'vaibhav-county',
  displayName: 'Vaibhav County',
  corridorLabel: 'Sadashivpet · Mumbai Highway corridor',
  h1: <>Vaibhav County</>,
  opportunityParagraphs: [
    'Vaibhav County is an open-plot project in Sadashivpet, in the Mumbai Highway corridor. Request the layout and project entrance pin to understand the location and compare plot options.',
    'Share your budget, preferred size and facing with Bhuwanta for current options and a written quote. Review the documents for your shortlisted plot and arrange a site visit to assess the access roads, surroundings and development.',
  ],
  locationAdvantages: [
    'Located in Sadashivpet in the Mumbai Highway corridor',
    'Request the entrance pin and directions from Hyderabad or Sangareddy',
    'Compare the access route and surrounding area during your site visit',
  ],
  faqs: [
    {
      question: 'Where is Vaibhav County located?',
      answer: 'Vaibhav County is in Sadashivpet in the Mumbai Highway corridor. Ask for the exact project entrance pin and directions before travelling to the site.',
    },
    {
      question: 'How can I review the project approvals?',
      answer: 'Request the project-specific layout approval, applicable RERA registration details and title documents for the plot you are considering. Ask the team to identify its plot number and dimensions on the layout.',
    },
    {
      question: 'What is the pricing for plots at Vaibhav County?',
      answer: 'Contact Bhuwanta for current plot options and a written quote. Request the plot number, dimensions, facing, quoted rate and a breakdown of applicable charges.',
    },
    {
      question: 'How do I book a Vaibhav County site visit?',
      answer: 'Use the enquiry form or WhatsApp to share your preferred day, starting location and plot requirements. The team can confirm the visit schedule and entrance pin.',
    },
  ],
  relatedLinks: [
    { href: '/sadashivpet-open-plots', label: 'Plots in Sadashivpet' },
    { href: '/projects', label: 'All projects' },
    { href: '/hmda-vs-dtcp-plots-hyderabad', label: 'Understanding HMDA and DTCP approvals' },
    { href: '/projects/tjr-township', label: 'TJR Township at Sangareddy Junction' },
  ],
}

export default function VaibhavCountyPage() {
  return <ProjectLandingTemplate config={config} />
}

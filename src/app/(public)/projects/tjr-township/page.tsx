import { Metadata } from 'next'
import { ProjectLandingTemplate, ProjectLandingConfig, buildProjectPageMetadata } from '@/components/ui/ProjectLandingTemplate'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return buildProjectPageMetadata(
    config,
    'TJR Township, Sangareddy Junction | Bhuwanta',
    'TJR Township, HMDA & RERA approved open plots at Sangareddy Junction on the Mumbai Highway (NH 65), a curated land asset by Bhuwanta.'
  )
}

const config: ProjectLandingConfig = {
  sanityName: 'TJR TownShip',
  slug: 'tjr-township',
  displayName: 'TJR Township',
  corridorLabel: 'Sangareddy Junction, Mumbai Highway',
  h1: <>TJR Township</>,
  opportunityParagraphs: [
    'TJR Township sits at Sangareddy Junction on the Mumbai Highway (NH 65), the district headquarters of Sangareddy and a well-established connectivity point between Hyderabad and Maharashtra. As a district headquarters town on a national highway, Sangareddy carries durable administrative and commercial activity that supports long-term land value.',
    'This is an HMDA approved and RERA registered layout, the stricter infrastructure and approval standards that come with HMDA jurisdiction, in one of the corridor\'s more established junction towns.',
  ],
  locationAdvantages: [
    'Directly at Sangareddy Junction on the Mumbai Highway (NH 65)',
    'Sangareddy district headquarters, established administrative and commercial hub',
    'HMDA approved layout with wider infrastructure standards',
  ],
  faqs: [
    {
      question: 'Is TJR Township HMDA approved?',
      answer: 'Yes. TJR Township is HMDA approved and RERA registered. Approval and RERA documents are available for review: request them through the enquiry form or WhatsApp.',
    },
    {
      question: 'Why invest at Sangareddy Junction?',
      answer: 'Sangareddy is the district headquarters of Sangareddy district, situated directly on the Mumbai Highway (NH 65) connecting Hyderabad toward Maharashtra, a combination of administrative significance and highway connectivity that supports durable, long-term land value.',
    },
    {
      question: 'What is the pricing for plots at TJR Township?',
      answer: 'Contact Bhuwanta for current plot availability, pricing and a full cost breakdown. You can enquire through the form or WhatsApp.',
    },
  ],
  relatedLinks: [
    { href: '/projects', label: 'All Projects' },
    { href: '/hmda-vs-dtcp-plots-hyderabad', label: 'HMDA vs DTCP Approved Plots' },
    { href: '/projects/vaibhav-county', label: 'Vaibhav County (Sadashivpet, same Mumbai Highway corridor)' },
  ],
}

export default function TjrTownshipPage() {
  return <ProjectLandingTemplate config={config} />
}

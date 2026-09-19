import { Metadata } from 'next'
import { ProjectLandingTemplate, ProjectLandingConfig, buildProjectPageMetadata } from '@/components/ui/ProjectLandingTemplate'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return buildProjectPageMetadata(
    config,
    'S.V. Kanaka Maple Homes, Warangal Highway | Bhuwanta',
    'S.V. Kanaka Maple Homes, DTCP & RERA approved open plots on the Warangal Highway, near the Yadagirigutta temple corridor.'
  )
}

const config: ProjectLandingConfig = {
  sanityName: 'S.V.KANAKA MAPLE HOMES',
  slug: 'sv-kanaka-maple-homes',
  displayName: 'S.V. Kanaka Maple Homes',
  corridorLabel: 'Warangal Highway, near Yadagirigutta',
  h1: <>S.V. Kanaka Maple Homes</>,
  opportunityParagraphs: [
    'S.V. Kanaka Maple Homes sits on the Warangal Highway corridor, close to Yadagirigutta, home to the Sri Lakshmi Narasimha Swamy Temple, one of the most significant temple redevelopment and tourism-infrastructure efforts in the region. Growth corridors anchored by major temple towns tend to see sustained visitor traffic and connectivity investment over the long term, independent of any single project.',
    'This is a DTCP and RERA approved layout, built for buyers who want a clear-titled, Vastu-compliant plot with room to grow as the surrounding corridor develops.',
  ],
  locationAdvantages: [
    'Located directly on the Warangal Highway (NH 163), connecting Hyderabad to Warangal',
    'Proximity to the Yadagirigutta temple corridor and its ongoing development activity',
    'DTCP approved layout with clear legal documentation',
  ],
  faqs: [
    {
      question: 'Is S.V. Kanaka Maple Homes DTCP approved?',
      answer: 'Yes. S.V. Kanaka Maple Homes is DTCP approved and RERA registered. Approval and RERA documents are available for review: request them through the enquiry form or WhatsApp.',
    },
    {
      question: 'Why invest near Yadagirigutta?',
      answer: 'Yadagirigutta is home to the Sri Lakshmi Narasimha Swamy Temple and has seen significant temple redevelopment and tourism-infrastructure investment, which tends to support sustained connectivity and footfall growth along the surrounding corridor.',
    },
    {
      question: 'What is the pricing for plots at S.V. Kanaka Maple Homes?',
      answer: 'Contact Bhuwanta for current plot availability, pricing and a full cost breakdown. You can enquire through the form or WhatsApp.',
    },
  ],
  relatedLinks: [
    { href: '/projects', label: 'All Projects' },
    { href: '/hmda-vs-dtcp-plots-hyderabad', label: 'HMDA vs DTCP Approved Plots' },
  ],
}

export default function SVKanakaMapleHomesPage() {
  return <ProjectLandingTemplate config={config} />
}

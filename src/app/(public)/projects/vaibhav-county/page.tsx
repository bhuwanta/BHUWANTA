import { Metadata } from 'next'
import { ProjectLandingTemplate, ProjectLandingConfig, buildProjectPageMetadata } from '@/components/ui/ProjectLandingTemplate'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return buildProjectPageMetadata(
    config,
    'Vaibhav County — Sadashivpet, Mumbai Highway | Bhuwanta',
    'Vaibhav County — DTCP & RERA approved open plots in Sadashivpet on the Mumbai Highway (NH 65), a curated land asset by Bhuwanta.'
  )
}

const config: ProjectLandingConfig = {
  sanityName: 'VAIBHAV COUNTY',
  slug: 'vaibhav-county',
  displayName: 'Vaibhav County',
  corridorLabel: 'Sadashivpet, Mumbai Highway',
  h1: <>Vaibhav County</>,
  opportunityParagraphs: [
    'Vaibhav County sits in Sadashivpet, on the Mumbai Highway (NH 65) between Hyderabad and Sangareddy — a corridor that has seen growing industrial and residential development pushed outward from the city along this highway. DTCP-approved layouts in this belt typically offer a more affordable entry point than HMDA-jurisdiction land closer to the city, with room to appreciate as infrastructure catches up.',
    'This is a DTCP approved and RERA registered layout, built for buyers prioritizing affordability and long-term growth along an established highway corridor.',
  ],
  locationAdvantages: [
    'Located in Sadashivpet on the Mumbai Highway (NH 65)',
    'Positioned between Hyderabad and Sangareddy on an established growth corridor',
    'DTCP approved layout — typically a more affordable entry point than HMDA-jurisdiction land',
  ],
  faqs: [
    {
      question: 'Is Vaibhav County DTCP approved?',
      answer: 'Yes. Vaibhav County is DTCP approved and RERA registered. Approval and RERA documents are available for review — request them through the enquiry form or WhatsApp.',
    },
    {
      question: 'Why invest in Sadashivpet?',
      answer: 'Sadashivpet sits on the Mumbai Highway (NH 65) between Hyderabad and Sangareddy, a corridor that has seen growing development pushed outward from the city. DTCP-approved land here typically offers a more affordable entry point than HMDA-jurisdiction plots closer in.',
    },
    {
      question: 'What is the pricing for plots at Vaibhav County?',
      answer: 'Contact Bhuwanta for current plot availability, pricing and a full cost breakdown. You can enquire through the form or WhatsApp.',
    },
  ],
  relatedLinks: [
    { href: '/projects', label: 'All Projects' },
    { href: '/hmda-vs-dtcp-plots-hyderabad', label: 'HMDA vs DTCP Approved Plots' },
    { href: '/projects/tjr-township', label: 'TJR Township (Sangareddy Junction, same Mumbai Highway corridor)' },
  ],
}

export default function VaibhavCountyPage() {
  return <ProjectLandingTemplate config={config} />
}

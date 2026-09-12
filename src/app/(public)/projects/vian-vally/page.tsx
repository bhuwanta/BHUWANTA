import { Metadata } from 'next'
import { ProjectLandingTemplate, ProjectLandingConfig, buildProjectPageMetadata } from '@/components/ui/ProjectLandingTemplate'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return buildProjectPageMetadata(
    config,
    'Vian Vally — Shabad, NH-44 Bangalore Highway | Bhuwanta',
    'Vian Vally — HMDA & RERA approved open plots in Shabad, on the NH-44 Bangalore Highway corridor. A curated, investor-grade land asset by Bhuwanta.'
  )
}

const config: ProjectLandingConfig = {
  sanityName: 'VIAN VALLEY',
  slug: 'vian-vally',
  displayName: 'Vian Vally',
  corridorLabel: 'Shabad, NH-44 Bangalore Highway',
  h1: <>Vian Vally</>,
  opportunityParagraphs: [
    'Vian Vally sits in Shabad, directly on the NH-44 Bangalore Highway corridor southwest of Hyderabad. This corridor benefits from durable highway connectivity to the city, independent of any single project or developer.',
    'This is an HMDA approved and RERA registered layout, offering the stricter infrastructure standards that come with HMDA jurisdiction, in a corridor that has drawn growing investor attention.',
  ],
  locationAdvantages: [
    'Directly on the NH-44 Bangalore Highway corridor',
    'HMDA approved layout with wider road and infrastructure standards',
    'Part of the same growth belt as the neighboring Shadnagar corridor',
  ],
  faqs: [
    {
      question: 'Is Vian Vally HMDA approved?',
      answer: 'Yes. Vian Vally is HMDA approved and RERA registered. Approval and RERA documents are available for review — request them through the enquiry form or WhatsApp.',
    },
    {
      question: 'Why invest in Shabad?',
      answer: 'Shabad sits directly on the NH-44 Bangalore Highway corridor southwest of Hyderabad, giving it durable connectivity advantages tied to the highway itself rather than any single development.',
    },
    {
      question: 'What is the pricing for plots at Vian Vally?',
      answer: 'Bhuwanta shares exclusive investor pricing directly during a private consultation rather than publishing it. Enquire through the form or WhatsApp for today\'s rate.',
    },
  ],
  relatedLinks: [
    { href: '/projects', label: 'All Projects' },
    { href: '/shabad-open-plots', label: 'Open Plots in Shabad' },
    { href: '/blog/open-plots-shabad-hyderabad-hmda-approved-guide', label: 'Shabad Open Plots Guide' },
    { href: '/blog/shabad-vs-shadnagar-investment-comparison', label: 'Shabad vs Shadnagar' },
  ],
}

export default function VianVallyPage() {
  return <ProjectLandingTemplate config={config} />
}

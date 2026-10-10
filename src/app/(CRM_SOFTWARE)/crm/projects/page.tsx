import ProjectsClient from './ProjectsClient'
import { client } from '@/lib/sanity'
import { requireAccess } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

const PROJECTS_QUERY = `
  *[_type == "projects"][0] {
    projectEntries[] {
      name,
      "categoryName": category->title,
      location,
      description,
      googleMapsUrl,
      "brochureUrl": brochure[0].asset->url,
      "layoutPdfUrl": layoutPdf[0].asset->url,
      "reraCertificateUrl": reraCertificate[0].asset->url,
      "hmdaDtcpCertificateUrl": hmdaDtcpCertificate[0].asset->url,
      approvalCertificateLabel
    }
  }
`

export default async function ProjectsPage() {
  await requireAccess('projects') // Validate access but we ignore the 'edit' return value since this page is strictly read-only
  
  // Fetch Sanity projects natively
  const sanityData = await client.fetch(PROJECTS_QUERY)
  const projects = sanityData?.projectEntries || []

  return <ProjectsClient projects={projects} />
}

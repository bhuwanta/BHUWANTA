import { Metadata } from 'next'
import { getProject3DData, VIAN_VALLEY_3D_PROJECT } from '@/data/projects3d/index'
import { ProjectLayout3DViewer } from '@/components/3d/ProjectLayout3DViewer'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const project3D = getProject3DData(slug) || VIAN_VALLEY_3D_PROJECT

  return {
    title: `${project3D.projectName} - 3D Interactive Layout & Inventory | Bhuwanta`,
    description: `Explore the interactive 3D masterplan of ${project3D.projectName} in ${project3D.location}. Inspect real-time plot availability, facing, sizes, and nearby connectivity.`,
  }
}

export default async function Project3DPage({ params }: PageProps) {
  const { slug } = await params
  const project3D = getProject3DData(slug) || VIAN_VALLEY_3D_PROJECT

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-950 relative">
      <ProjectLayout3DViewer project={project3D} fullScreenPage={true} />
    </main>
  )
}

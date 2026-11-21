import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject3DData, VIAN_VALLEY_3D_PROJECT } from '@/data/projects3d'
import { ProjectLayout3DViewer } from '@/components/3d/ProjectLayout3DViewer'
import { ArrowLeft, Compass, ShieldCheck } from 'lucide-react'

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
  // Use specific project 3D data or fallback to Vian Valley flagship layout
  const project3D = getProject3DData(slug) || VIAN_VALLEY_3D_PROJECT

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Project
          </Link>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-bold text-white">{project3D.projectName}</span>
            <span className="text-xs text-brand-gold font-medium">· {project3D.location}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> HMDA / DTCP Sanctioned Coordinates
          </div>
          <Link
            href={`/projects/${slug}#book-visit`}
            className="px-3.5 py-1.5 rounded-lg bg-brand-gold hover:bg-brand-gold-hover text-slate-950 text-xs font-bold transition-all shadow-sm"
          >
            Request Site Visit
          </Link>
        </div>
      </header>

      {/* Main 3D Canvas Area */}
      <main className="flex-1 w-full relative">
        <ProjectLayout3DViewer project={project3D} fullScreenPage={true} />
      </main>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { MapPin, Crown, Check, Download, Play } from 'lucide-react'
import { ProjectImageCarousel } from '@/components/ui/ProjectImageCarousel'
import { DownloadPopup } from '@/components/ui/DownloadPopup'

export interface ProjectEntry {
  name: string
  category?: string
  categoryTitle?: string
  slug?: { current: string }
  location: string
  googleMapsUrl?: string
  description: string
  plotSizes: string
  images?: string[]
  projectHighlights?: string[]
  brochureUrls?: string[]
  layoutUrls?: string[]
  reraUrls?: string[]
  approvalCertificateLabel?: string
  hmdaDtcpUrls?: string[]
  approvalBadge?: string
  videoUrl?: string
  youtubeUrl?: string
  videoUrls?: string[]
  youtubeUrls?: string[]
  // count() in GROQ returns null (not 0) when the field was never set.
  videoCount?: number | null
}

// Fallback slugs for the hand-authored /projects/<slug> pages, keyed by the
// exact project name as stored in Sanity — used until/unless an editor sets
// the CMS slug field, at which point project.slug?.current takes precedence.
const KNOWN_PROJECT_SLUGS: Record<string, string> = {
  'S.V.KANAKA MAPLE HOMES': 'sv-kanaka-maple-homes',
  'TJR TownShip': 'tjr-township',
  'VAIBHAV COUNTY': 'vaibhav-county',
  'VIAN VALLEY': 'vian-vally',
}

function getKnownSlug(name: string): string | undefined {
  return KNOWN_PROJECT_SLUGS[name] || KNOWN_PROJECT_SLUGS[name.trim()]
}

// Resolve the slug the same way the "View Project" link does, so the Videos
// button never sends someone to a different spelling of the project they are
// already looking at.
function getProjectSlug(project: ProjectEntry): string | undefined {
  return project.slug?.current || getKnownSlug(project.name)
}

export function ProjectsFilterClient({
  projects,
  categories = [],
  overviewUrls,
  overviewButtonLabel,
}: {
  projects: ProjectEntry[]
  categories?: { id: string; title: string; label: string; order?: number }[]
  overviewUrls?: string[] | null
  overviewButtonLabel?: string
}) {
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const filterRef = useRef<HTMLDivElement>(null)
  const [downloadQueue, setDownloadQueue] = useState<{ urls: string[]; projectName: string; documentType: string } | null>(null)

  // overviewPdf[].asset->url yields null, not [], when nothing is uploaded.
  const hasOverview = Boolean(overviewUrls && overviewUrls.length > 0)

  const handleFilterClick = (catId: string) => {
    setActiveFilter(catId)
    setTimeout(() => {
      if (filterRef.current) {
        // Adjust scroll offset to account for navbar height
        const y = filterRef.current.getBoundingClientRect().top + window.scrollY - 100
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
    }, 10)
  }

  const sortedCategories = [...categories].sort((a, b) => {
    const aHasProjects = projects.some(p => p.category === a.id)
    const bHasProjects = projects.some(p => p.category === b.id)
    
    if (aHasProjects && !bHasProjects) return -1
    if (!aHasProjects && bHasProjects) return 1
    
    return (a.order || 99) - (b.order || 99)
  })

  const filterCategories = [
    { id: 'all', title: 'All Projects', label: 'All' },
    ...sortedCategories
  ]

  const activeCategories = activeFilter === 'all' 
    ? filterCategories.filter(c => c.id !== 'all') 
    : filterCategories.filter(c => c.id === activeFilter)

  return (
    <div ref={filterRef}>
      <div className="bg-white border-b border-[#e8ecf2] py-4 shadow-sm z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-center gap-2.5 w-full">
            {filterCategories.map((cat) => (
              <button 
                key={cat.id} 
                onClick={() => handleFilterClick(cat.id)}
                className={`lg:flex-1 flex items-center justify-center gap-1.5 text-xs lg:text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 whitespace-nowrap ${
                  activeFilter === cat.id 
                    ? 'gradient-gold text-white shadow-md' 
                    : 'bg-white border border-[#c4a55a] text-[#c4a55a] hover:bg-[#c4a55a] hover:text-white shadow-sm'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${activeFilter === cat.id ? 'text-white' : ''}`} />
                <span className="capitalize">{cat.label}</span>
              </button>
            ))}

            {/* Not a filter — an action. Solid gold so it doesn't read as a
                seventh category tab. Reuses the same OTP download popup as the
                project brochures, so it captures a lead the same way. */}
            <button
              type="button"
              disabled={!hasOverview}
              title={hasOverview ? undefined : 'Coming soon'}
              onClick={() =>
                setDownloadQueue({
                  urls: overviewUrls as string[],
                  projectName: 'Bhuwanta Projects',
                  documentType: overviewButtonLabel || 'Projects Overview',
                })
              }
              className="lg:flex-none flex items-center justify-center gap-1.5 text-xs lg:text-sm font-semibold px-4 lg:px-5 py-2 rounded-full transition-all duration-300 whitespace-nowrap gradient-gold text-white shadow-md enabled:hover:scale-105 enabled:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>{overviewButtonLabel || 'Download Projects Overview'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="py-16 bg-[#f7f8fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          {activeCategories.map((category) => (
            <section key={category.id} id={category.id} className="scroll-mt-36">
              <div className="flex items-center justify-center gap-3 mb-8 text-center">
                <div className="w-10 h-10 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[#0f1d33]" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#c4a55a]">{category.title}</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-8">
                {projects.filter(p => p.category === category.id).length > 0 ? (
                  projects.filter(p => p.category === category.id).map((project, idx) => {
                    const projectSlug = getProjectSlug(project)
                    const showVideos = (project.videoCount ?? 0) > 0 && Boolean(projectSlug)
                    // The mobile button grid is 2 columns. Two of the buttons are
                    // conditional, so whether the last one has to span both
                    // columns to sit flush depends on how many are showing.
                    const buttonCount = 6 + (projectSlug ? 1 : 0) + (showVideos ? 1 : 0)
                    const lastButtonSpan = buttonCount % 2 === 0 ? 'col-span-1' : 'col-span-2'
                    return (
                    <div key={idx} className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl overflow-hidden flex flex-col lg:flex-row transition-premium hover:shadow-md group">
                      
                      {/* Left: Image Area */}
                      <div className="w-full lg:w-2/5 h-64 lg:h-auto bg-[#f3f5f8] relative overflow-hidden flex-shrink-0 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[#e8ecf2]">
                        <ProjectImageCarousel 
                          images={project.images} 
                          projectName={project.name} 
                          videoUrl={project.videoUrl || project.videoUrls?.[0]} 
                          youtubeUrl={project.youtubeUrl || project.youtubeUrls?.[0]} 
                        />
                        <div className="absolute inset-0 bg-[#1e3a5f]/5 group-hover:bg-transparent transition-colors z-30 pointer-events-none"></div>
                      </div>

                      {/* Right: Content */}
                      <div className="p-6 md:p-8 flex flex-col w-full">
                         <div className="flex flex-wrap gap-2 mb-3">
                           <span className="px-3 py-1 bg-[#c4a55a] text-white rounded-full text-[10px] font-bold uppercase tracking-wider">Open Plots</span>
                           {project.approvalBadge && (
                             <span className="px-3 py-1 bg-[#c4a55a] text-white rounded-full text-[10px] font-bold uppercase tracking-wider">{project.approvalBadge}</span>
                           )}
                         </div>

                         <h3 className="text-xl font-extrabold text-[#1e3a5f] mb-1 flex items-center gap-2"><Crown className="w-5 h-5 text-[#c4a55a] shrink-0" /> {project.name}</h3>
                         <p className="text-sm font-semibold text-[#c4a55a] mb-6">
                           {project.location || 'Location Details Available Soon'}
                         </p>

                         {project.projectHighlights && project.projectHighlights.length > 0 && (
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 mb-8 text-sm font-medium text-[#0f1d33]">
                             {project.projectHighlights.map((highlight, i) => (
                               <div key={i} className="flex items-center gap-2">
                                 <div className="w-4 h-4 rounded-full bg-[#c4a55a] flex items-center justify-center shrink-0">
                                   <Check className="w-3 h-3 text-white stroke-[3]" />
                                 </div>
                                 {highlight}
                               </div>
                             ))}
                           </div>
                         )}

                         <div className="mt-auto">
                            <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 md:gap-3 mb-4">
                              <Link href={`/#book-visit?project=${encodeURIComponent(project.name)}`} className="w-full col-span-1 px-2 py-2 md:px-6 md:w-auto gradient-gold text-white font-semibold rounded-lg shadow-lg shadow-[#c4a55a]/20 hover:scale-105 transition-premium text-xs sm:text-sm text-center flex items-center justify-center md:justify-start">
                                Enquire Now
                              </Link>
                              {projectSlug && (
                                <Link href={`/projects/${projectSlug}`} className="w-full col-span-1 px-2 py-2 md:px-6 md:w-auto bg-white border border-[#c4a55a] text-[#c4a55a] font-semibold rounded-lg hover:bg-[#f7f8fa] transition-premium text-xs sm:text-sm text-center flex items-center justify-center md:justify-start">
                                  View Project
                                </Link>
                              )}
                              <button type="button" onClick={() => project.googleMapsUrl && window.open(project.googleMapsUrl, '_blank')} className="w-full col-span-1 px-2 py-2 md:px-5 md:w-auto bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] hover:shadow-md transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start gap-1 md:gap-2 cursor-pointer">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-[#c4a55a] flex-shrink-0" /> <span className="truncate">View Location</span>
                              </button>
                              {showVideos && (
                                <Link href={`/projects/${projectSlug}/videos`} className="w-full col-span-1 px-2 py-2 md:px-5 md:w-auto bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] hover:shadow-md transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start gap-1 md:gap-2">
                                  <Play className="w-3 h-3 sm:w-4 sm:h-4 text-[#c4a55a] flex-shrink-0" /> <span className="truncate">Videos</span>
                                </Link>
                              )}
                              <button type="button" onClick={() => setDownloadQueue({ urls: project.brochureUrls!, projectName: project.name, documentType: 'Brochure' })} className="w-full col-span-1 px-2 py-2 md:px-5 md:w-auto bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] hover:shadow-md transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start gap-1 md:gap-2 cursor-pointer" disabled={!project.brochureUrls || project.brochureUrls.length === 0}>
                                <Download className="w-3 h-3 sm:w-4 sm:h-4 text-[#c4a55a] flex-shrink-0" /> <span className="truncate">Brochure</span>
                              </button>
                              <button type="button" onClick={() => setDownloadQueue({ urls: project.layoutUrls!, projectName: project.name, documentType: 'Layout' })} className="w-full col-span-1 px-2 py-2 md:px-5 md:w-auto bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] hover:shadow-md transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start gap-1 md:gap-2 cursor-pointer" disabled={!project.layoutUrls || project.layoutUrls.length === 0}>
                                <Download className="w-3 h-3 sm:w-4 sm:h-4 text-[#c4a55a] flex-shrink-0" /> <span className="truncate">Layout</span>
                              </button>
                              <button type="button" onClick={() => setDownloadQueue({ urls: project.reraUrls!, projectName: project.name, documentType: 'RERA Documents' })} className="w-full col-span-1 px-2 py-2 md:px-5 md:w-auto bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] hover:shadow-md transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start gap-1 md:gap-2 cursor-pointer" disabled={!project.reraUrls || project.reraUrls.length === 0}>
                                <Download className="w-3 h-3 sm:w-4 sm:h-4 text-[#c4a55a] flex-shrink-0" /> <span className="truncate">RERA <span className="hidden md:inline">Documents</span><span className="md:hidden">Docs</span></span>
                              </button>
                              <button type="button" onClick={() => setDownloadQueue({ urls: project.hmdaDtcpUrls!, projectName: project.name, documentType: project.approvalCertificateLabel || 'HMDA/DTCP Approved' })} className={`w-full ${lastButtonSpan} md:col-span-1 px-2 py-2 md:px-5 md:w-auto bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] hover:shadow-md transition-all text-xs sm:text-sm text-center flex items-center justify-center md:justify-start gap-1 md:gap-2 cursor-pointer`} disabled={!project.hmdaDtcpUrls || project.hmdaDtcpUrls.length === 0}>
                                <Download className="w-3 h-3 sm:w-4 sm:h-4 text-[#c4a55a] flex-shrink-0" /> <span className="truncate">{project.approvalCertificateLabel || 'HMDA/DTCP Approved'}</span>
                              </button>
                            </div>
                         </div>
                      </div>
                    </div>
                    )
                  })
                ) : (
                  <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-[#f3f5f8] rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-8 h-8 text-[#1e3a5f]/40" />
                    </div>
                    <h3 className="text-xl font-bold text-[#0f1d33] mb-2">New Projects Coming Soon</h3>
                    <p className="text-[#5a6a82]">We are actively acquiring premium lands in {category.title.replace(' Projects', '')}. Stay tuned!</p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      <DownloadPopup
        isOpen={downloadQueue !== null}
        onClose={() => setDownloadQueue(null)}
        urls={downloadQueue?.urls || []}
        projectName={downloadQueue?.projectName || ''}
        documentType={downloadQueue?.documentType || ''}
      />
    </div>
  )
}

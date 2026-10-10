'use client'

import { useState, useMemo } from 'react'
import { Search, MapPin, FileText, LayoutTemplate, Map, ShieldCheck, FileBadge, ExternalLink } from 'lucide-react'

type SanityProject = {
  name: string
  categoryName?: string
  location?: string
  description?: string
  googleMapsUrl?: string
  brochureUrl?: string
  layoutPdfUrl?: string
  reraCertificateUrl?: string
  hmdaDtcpCertificateUrl?: string
  approvalCertificateLabel?: string
}

interface ProjectsClientProps {
  projects: SanityProject[]
}

export default function ProjectsClient({ projects }: ProjectsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Extract unique categories for the sidebar
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>()
    projects.forEach(p => {
      if (p.categoryName) uniqueCategories.add(p.categoryName)
    })
    return Array.from(uniqueCategories).sort()
  }, [projects])

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (project.location && project.location.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory ? project.categoryName === selectedCategory : true

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f1d33]">Areas & Projects</h1>
          <p className="mt-2 text-sm text-[#5a6a82]">
            Browse all projects mapped by area. Data is synchronized directly from the live website.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sidebar: Areas / Categories */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-[#5a6a82]" />
            </div>
            <input
              type="text"
              className="w-full bg-white border border-[#e8ecf2] rounded-lg pl-9 pr-4 py-2 text-sm text-[#0f1d33] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white border border-[#e8ecf2] rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#e8ecf2] bg-[#f7f8fa]">
              <h3 className="font-semibold text-[#0f1d33] text-sm flex items-center">
                <Map className="w-4 h-4 mr-2 text-[#c4a55a]" />
                Filter by Area
              </h3>
            </div>
            <div className="flex flex-col divide-y divide-[#e8ecf2]">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-3 text-left text-sm transition-colors ${
                  selectedCategory === null 
                    ? 'bg-[#1e3a5f] text-white font-medium' 
                    : 'text-[#5a6a82] hover:bg-[#f7f8fa]'
                }`}
              >
                All Areas
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-3 text-left text-sm transition-colors ${
                    selectedCategory === category 
                      ? 'bg-[#1e3a5f] text-white font-medium' 
                      : 'text-[#5a6a82] hover:bg-[#f7f8fa]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content: Projects List */}
        <div className="flex-1 space-y-4">
          {filteredProjects.length === 0 ? (
            <div className="bg-white border border-[#e8ecf2] rounded-xl p-12 text-center shadow-sm">
              <p className="text-[#5a6a82]">No projects found in this area.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredProjects.map((project, idx) => (
                <div key={`${project.name}-${idx}`} className="bg-white border border-[#e8ecf2] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-[#1e3a5f] text-lg leading-tight">{project.name}</h3>
                        {project.categoryName && (
                          <span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-[#f3f5f8] text-[#c4a55a] text-[10px] font-bold uppercase tracking-wider border border-[#e8ecf2]">
                            {project.categoryName}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {project.location && (
                      <div className="flex items-center text-[#5a6a82] text-sm mt-3">
                        <MapPin className="w-4 h-4 mr-1.5 shrink-0" />
                        <span className="line-clamp-1">{project.location}</span>
                      </div>
                    )}
                    
                    {project.description && (
                      <p className="text-[#5a6a82] text-sm mt-3 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-[#f7f8fa] border-t border-[#e8ecf2] p-4 flex flex-wrap gap-3">
                    {project.googleMapsUrl && (
                      <a 
                        href={project.googleMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center bg-white border border-[#e8ecf2] rounded-lg px-3 py-2 text-xs font-medium text-[#1e3a5f] hover:bg-[#f3f5f8] transition-colors whitespace-nowrap shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        Google Maps
                      </a>
                    )}
                    {project.brochureUrl && (
                      <a 
                        href={project.brochureUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center bg-gradient-to-r from-[#c4a55a] to-[#b3954c] rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        Brochure
                      </a>
                    )}
                    {project.layoutPdfUrl && (
                      <a 
                        href={project.layoutPdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center bg-[#1e3a5f] rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0f1d33] transition-colors whitespace-nowrap"
                      >
                        <LayoutTemplate className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        Layout PDF
                      </a>
                    )}
                    {project.reraCertificateUrl && (
                      <a 
                        href={project.reraCertificateUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center bg-white border border-[#e8ecf2] rounded-lg px-3 py-2 text-xs font-medium text-[#1e3a5f] shadow-sm hover:bg-[#f3f5f8] transition-colors whitespace-nowrap"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5 shrink-0 text-emerald-600" />
                        RERA Certificate
                      </a>
                    )}
                    {project.hmdaDtcpCertificateUrl && (
                      <a 
                        href={project.hmdaDtcpCertificateUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center bg-white border border-[#e8ecf2] rounded-lg px-3 py-2 text-xs font-medium text-[#1e3a5f] shadow-sm hover:bg-[#f3f5f8] transition-colors whitespace-nowrap"
                      >
                        <FileBadge className="w-3.5 h-3.5 mr-1.5 shrink-0 text-[#c4a55a]" />
                        {project.approvalCertificateLabel || "HMDA/DTCP Cert"}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

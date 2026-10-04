'use client'

import { useState, useEffect } from 'react'
import { client } from '@/lib/sanity'
import { FileText, Upload, Loader2, ExternalLink, Search, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const layoutsQuery = `*[_type == "projects"][0]{
  projectEntries[]{
    _key,
    name,
    location,
    "layouts": layoutPdf[]{ 
      _key, 
      "url": asset->url,
      "originalFilename": asset->originalFilename
    }
  }
}`

type SupabaseArea = {
  id: string;
  name: string;
};

type SupabaseProject = {
  name: string;
  project_areas?: { area: SupabaseArea }[];
};

type ProjectEntry = {
  _key: string;
  name: string;
  location: string | null;
  layouts: { _key: string; url: string; originalFilename?: string }[] | null;
  mappedAreas?: SupabaseArea[];
}

export default function LayoutsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (project.location && project.location.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      // 1. Fetch projects from Sanity
      const data = await client.fetch<{ projectEntries: ProjectEntry[] }>(layoutsQuery)
      let sanityProjects = data?.projectEntries || []

      // 2. Fetch mapped areas from Supabase
      const supabase = createClient()
      const { data: supabaseData, error } = await supabase
        .from('projects')
        .select(`
          name,
          project_areas(
            area:areas(id, name)
          )
        `)

      if (!error && supabaseData) {
        // Merge Supabase areas into Sanity projects by name match
        sanityProjects = sanityProjects.map(sp => {
          const matchingSupabase = supabaseData.find(
            (sup: any) => sup.name.trim().toLowerCase() === sp.name.trim().toLowerCase()
          )
          if (matchingSupabase && matchingSupabase.project_areas) {
            return {
              ...sp,
              mappedAreas: matchingSupabase.project_areas.map((pa: any) => pa.area)
            }
          }
          return sp
        })
      }

      setProjects(sanityProjects)
    } catch (error) {
      console.error("Failed to fetch projects", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, projectKey: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert("Please upload a PDF file.")
      return
    }

    setUploadingKey(projectKey)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'pdf')
    formData.append('page', 'projects')
    formData.append('projectKey', projectKey)
    formData.append('targetField', 'layoutPdf')

    try {
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        await fetchProjects()
        router.refresh()
      } else {
        alert(result.error || "Upload failed")
      }
    } catch (error) {
      console.error(error)
      alert("An unexpected error occurred during upload.")
    } finally {
      setUploadingKey(null)
      e.target.value = ''
    }
  }

  const handleDeleteLayout = async (projectKey: string, layoutKey: string) => {
    if (!confirm('Are you sure you want to delete this layout?')) return

    setDeletingKey(layoutKey)
    try {
      const response = await fetch('/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pdf',
          page: 'projects',
          projectKey,
          brochureKey: layoutKey, // API variable is named brochureKey, but it targets the key inside the array
          targetField: 'layoutPdf'
        }),
      })

      const result = await response.json()
      if (result.success) {
        await fetchProjects()
        router.refresh()
      } else {
        alert(result.error || "Delete failed")
      }
    } catch (error) {
      console.error(error)
      alert("An unexpected error occurred during deletion.")
    } finally {
      setDeletingKey(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0f1d33]">Layouts</h1>
        <p className="mt-2 text-sm text-[#5a6a82]">
          Manage and upload project layout plans (PDFs) to Sanity.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-[#5a6a82]" />
          </div>
          <input
            type="text"
            className="w-full bg-white border border-[#e8ecf2] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#0f1d33] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            placeholder="Search projects by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-[#e8ecf2] bg-white shadow-sm flex flex-col overflow-hidden h-[65vh] md:h-[75vh]">
        {isLoading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#c4a55a]" />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-auto">
            <table className="w-full text-sm text-left relative">
              <thead className="bg-[#f7f8fa] text-[#5a6a82] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-medium w-16">Sr.No</th>
                  <th className="px-6 py-4 font-medium">Project Name</th>
                  <th className="px-6 py-4 font-medium">Mapped Areas</th>
                  <th className="px-6 py-4 font-medium">Sanity Location</th>
                  <th className="px-6 py-4 font-medium">Current Layouts</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ecf2]">
                {filteredProjects.map((project, index) => (
                  <tr key={project._key} className="hover:bg-[#f3f5f8] transition-colors">
                    <td className="px-6 py-4 text-[#5a6a82]">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#0f1d33]">{project.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {project.mappedAreas && project.mappedAreas.length > 0 ? (
                          project.mappedAreas.map((area, i) => (
                            <span key={i} className="inline-flex items-center rounded bg-[#f3f5f8] px-2 py-0.5 text-xs font-medium text-[#0f1d33] border border-[#e8ecf2]">
                              {area.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#5a6a82] italic text-xs">Unmapped</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#5a6a82] text-xs">
                      {project.location || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {project.layouts && project.layouts.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {project.layouts.map((layout, index) => (
                            <div key={layout._key} className="flex items-center justify-between gap-2 group w-full max-w-[300px]">
                              <a 
                                href={layout.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e3a5f] hover:text-[#c4a55a] transition-colors flex-1 min-w-0"
                                title={layout.originalFilename || `Layout ${index + 1}`}
                              >
                                <FileText className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">
                                  {layout.originalFilename || `Layout ${index + 1}`}
                                </span>
                                <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                              </a>
                              <button
                                onClick={() => handleDeleteLayout(project._key, layout._key)}
                                disabled={deletingKey === layout._key}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all disabled:opacity-50 flex-shrink-0"
                                title="Delete layout"
                              >
                                {deletingKey === layout._key ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#5a6a82] italic text-sm">No layouts uploaded</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center">
                        <label className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors cursor-pointer ${
                          uploadingKey === project._key 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white border border-[#e8ecf2] text-[#0f1d33] hover:bg-[#f3f5f8]'
                        }`}>
                          {uploadingKey === project._key ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2 text-[#5a6a82]" />
                              Add PDF
                            </>
                          )}
                          <input 
                            type="file" 
                            accept=".pdf" 
                            className="hidden" 
                            disabled={uploadingKey === project._key}
                            onChange={(e) => handleFileUpload(e, project._key)}
                          />
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#5a6a82]">
                      No projects found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col divide-y divide-[#e8ecf2] overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <div className="p-8 text-center text-[#5a6a82]">
                  No projects found matching your search.
                </div>
              ) : (
                filteredProjects.map((project, index) => (
                  <div key={`mobile-project-${project._key}`} className="p-4 flex flex-col gap-3 hover:bg-[#f7f8fa]/50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-semibold text-[#1e3a5f] text-base">{project.name}</div>
                      <div className="text-xs text-[#5a6a82] shrink-0">{project.location || '-'}</div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-1">
                      <span className="text-xs text-[#5a6a82]">Mapped Areas:</span>
                      <div className="flex flex-wrap gap-1">
                        {project.mappedAreas && project.mappedAreas.length > 0 ? (
                          project.mappedAreas.map((area, i) => (
                            <span key={i} className="inline-flex items-center rounded bg-[#f3f5f8] px-2 py-0.5 text-[10px] font-medium text-[#0f1d33] border border-[#e8ecf2]">
                              {area.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#5a6a82] italic text-[10px]">Unmapped</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-1">
                      <span className="text-xs text-[#5a6a82]">Current Layouts:</span>
                      {project.layouts && project.layouts.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {project.layouts.map((layout, index) => (
                            <div key={layout._key} className="flex items-center justify-between gap-2 group w-full bg-[#f3f5f8] p-2 rounded-lg border border-[#e8ecf2]">
                              <a 
                                href={layout.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e3a5f] hover:text-[#c4a55a] transition-colors flex-1 min-w-0"
                                title={layout.originalFilename || `Layout ${index + 1}`}
                              >
                                <FileText className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate text-xs">
                                  {layout.originalFilename || `Layout ${index + 1}`}
                                </span>
                                <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                              </a>
                              <button
                                onClick={() => handleDeleteLayout(project._key, layout._key)}
                                disabled={deletingKey === layout._key}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all disabled:opacity-50 flex-shrink-0"
                                title="Delete layout"
                              >
                                {deletingKey === layout._key ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#5a6a82] italic text-xs">No layouts</span>
                      )}
                    </div>

                    <div className="mt-2 pt-3 border-t border-[#e8ecf2]">
                      <label className={`w-full inline-flex items-center justify-center rounded-lg border border-[#e8ecf2] px-3 py-2 text-sm font-medium cursor-pointer transition-colors ${uploadingKey === project._key ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-[#1e3a5f] hover:bg-gray-50'}`}>
                        {uploadingKey === project._key ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2 text-[#5a6a82]" />
                            Add PDF
                          </>
                        )}
                        <input 
                          type="file" 
                          accept=".pdf" 
                          className="hidden" 
                          disabled={uploadingKey === project._key}
                          onChange={(e) => handleFileUpload(e, project._key)}
                        />
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

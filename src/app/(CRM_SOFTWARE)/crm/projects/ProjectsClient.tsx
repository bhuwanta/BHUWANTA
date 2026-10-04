'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, X, Search } from 'lucide-react'
import { createProject, updateProject, deleteProject } from './actions'

type Area = {
  id: string
  name: string
}

type Project = {
  id: string
  name: string
  description: string | null
  location: string | null
  google_maps_url: string | null
  created_at: string
  project_areas?: { area: Area }[]
}

interface ProjectsClientProps {
  projects: Project[]
  areas: Area[]
}

export default function ProjectsClient({ projects, areas }: ProjectsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (project.location && project.location.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Local state for selected areas in the form
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([])

  const openAddModal = () => {
    setEditingProject(null)
    setSelectedAreaIds([])
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    const existingAreaIds = project.project_areas?.map(pa => pa.area.id) || []
    setSelectedAreaIds(existingAreaIds)
    setError('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProject(null)
    setSelectedAreaIds([])
  }

  const toggleArea = (areaId: string) => {
    if (selectedAreaIds.includes(areaId)) {
      setSelectedAreaIds(selectedAreaIds.filter(id => id !== areaId))
    } else {
      setSelectedAreaIds([...selectedAreaIds, areaId])
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    formData.append('areaIds', JSON.stringify(selectedAreaIds))

    try {
      if (editingProject) {
        const result = await updateProject(editingProject.id, formData)
        if (result.error) setError(result.error)
        else closeModal()
      } else {
        const result = await createProject(formData)
        if (result.error) setError(result.error)
        else closeModal()
      }
    } catch (err) {
      setError('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      const result = await deleteProject(id)
      if (result.error) alert(result.error)
    } catch (err) {
      alert('Failed to delete project.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f1d33]">Projects</h1>
          <p className="mt-2 text-sm text-[#5a6a82]">
            Manage your projects and map them to specific areas.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#c4a55a] to-[#b3954c] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#c4a55a]/20 hover:opacity-90 transition-opacity"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </button>
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

      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7f8fa] border-b border-[#e8ecf2]">
              <tr>
                <th className="px-6 py-4 font-medium text-[#0f1d33] w-16">Sr.No</th>
                <th className="px-6 py-4 font-medium text-[#0f1d33]">Name</th>
                <th className="px-6 py-4 font-medium text-[#0f1d33]">Mapped Areas</th>
                <th className="px-6 py-4 font-medium text-[#0f1d33]">Date Added</th>
                <th className="px-6 py-4 font-medium text-[#0f1d33] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ecf2]">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#5a6a82]">
                    No projects found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project, index) => (
                  <tr key={project.id} className="hover:bg-[#f7f8fa]/50 transition-colors">
                    <td className="px-6 py-4 text-[#5a6a82]">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#1e3a5f]">{project.name}</div>
                      {project.location && (
                        <div className="text-xs font-semibold text-[#c4a55a] mt-1">{project.location}</div>
                      )}
                      {project.description && (
                        <div className="text-xs text-[#5a6a82] mt-1 line-clamp-1">{project.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {project.project_areas && project.project_areas.length > 0 ? (
                          project.project_areas.map((pa, i) => (
                            <span key={i} className="inline-flex items-center rounded bg-[#f3f5f8] px-2 py-0.5 text-xs font-medium text-[#0f1d33] border border-[#e8ecf2]">
                              {pa.area.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#5a6a82] italic">No areas mapped</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#5a6a82]">
                      {(() => {
                        const d = new Date(project.created_at)
                        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => openEditModal(project)}
                        className="text-[#1e3a5f] hover:underline font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="text-red-600 hover:underline font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col divide-y divide-[#e8ecf2]">
          {filteredProjects.length === 0 ? (
            <div className="p-8 text-center text-[#5a6a82]">
              No projects found matching your search.
            </div>
          ) : (
            filteredProjects.map((project, index) => (
              <div key={`mobile-project-${project.id}`} className="p-4 flex flex-col gap-3 hover:bg-[#f7f8fa]/50 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="font-semibold text-[#1e3a5f] text-base">{project.name}</div>
                    {project.location && (
                      <div className="text-xs font-semibold text-[#c4a55a] mt-0.5">{project.location}</div>
                    )}
                  </div>
                  <div className="text-[10px] text-[#5a6a82] shrink-0 mt-1">
                    {(() => {
                      const d = new Date(project.created_at)
                      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
                    })()}
                  </div>
                </div>

                {project.description && (
                  <div className="text-sm text-[#5a6a82] line-clamp-2">{project.description}</div>
                )}

                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-xs text-[#5a6a82]">Mapped Areas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {project.project_areas && project.project_areas.length > 0 ? (
                      project.project_areas.map((pa, i) => (
                        <span key={i} className="inline-flex items-center rounded bg-[#f3f5f8] px-2 py-0.5 text-[10px] font-medium text-[#0f1d33] border border-[#e8ecf2]">
                          {pa.area.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-[#5a6a82] italic">No areas mapped</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-2 pt-3 border-t border-[#e8ecf2]">
                  <button
                    onClick={() => openEditModal(project)}
                    className="text-[#1e3a5f] hover:underline font-medium text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-red-600 hover:underline font-medium text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e8ecf2] px-6 py-4">
              <h3 className="text-lg font-semibold text-[#0f1d33]">
                {editingProject ? 'Edit Project' : 'Add New Project'}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-[#5a6a82] hover:bg-[#f3f5f8] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                    {error}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-[#0f1d33] mb-1">Project Name</label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        defaultValue={editingProject?.name}
                        className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                      />
                    </div>

                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-[#0f1d33] mb-1">Location (Optional)</label>
                      <input
                        type="text"
                        name="location"
                        id="location"
                        defaultValue={editingProject?.location || ''}
                        className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                      />
                    </div>

                    <div>
                      <label htmlFor="google_maps_url" className="block text-sm font-medium text-[#0f1d33] mb-1">Google Maps URL (Optional)</label>
                      <input
                        type="url"
                        name="google_maps_url"
                        id="google_maps_url"
                        defaultValue={editingProject?.google_maps_url || ''}
                        className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-[#0f1d33] mb-1">Description (Optional)</label>
                      <textarea
                        name="description"
                        id="description"
                        rows={3}
                        defaultValue={editingProject?.description || ''}
                        className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f] resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col h-full">
                    <label className="block text-sm font-medium text-[#0f1d33] mb-2">Map to Areas</label>
                    <div className="flex-1 overflow-y-auto p-4 bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg">
                      {areas.length === 0 ? (
                        <p className="text-xs text-[#5a6a82]">No areas available. Create an area first.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {areas.map(area => (
                            <label key={area.id} className="flex items-center space-x-3 hover:bg-white p-2 rounded transition-colors cursor-pointer border border-transparent hover:border-[#e8ecf2] hover:shadow-sm">
                              <input
                                type="checkbox"
                                checked={selectedAreaIds.includes(area.id)}
                                onChange={() => toggleArea(area.id)}
                                className="rounded border-[#e8ecf2] text-[#1e3a5f] focus:ring-[#1e3a5f]"
                              />
                              <span className="text-sm text-[#0f1d33] font-medium">{area.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3 border-t border-[#e8ecf2] pt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-[#5a6a82] hover:bg-[#f3f5f8] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f1d33] transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : (editingProject ? 'Save Changes' : 'Add Project')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

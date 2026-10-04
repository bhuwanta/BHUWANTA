'use client'

import { useState } from 'react'
import { createArea, updateArea, deleteArea } from './actions'
import { Search } from 'lucide-react'

type Area = {
  id: string
  name: string
  created_at: string
}

export default function AreasClient({ initialAreas }: { initialAreas: Area[] }) {
  const [areas, setAreas] = useState<Area[]>(initialAreas)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredAreas = areas.filter(area => 
    area.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)

    if (editingArea) {
      const res = await updateArea(editingArea.id, formData)
      if (res.success && res.data) {
        setAreas(areas.map(a => a.id === editingArea.id ? res.data[0] : a))
      } else {
        alert(res.error)
      }
    } else {
      const res = await createArea(formData)
      if (res.success && res.data) {
        setAreas([res.data[0], ...areas])
      } else {
        alert(res.error)
      }
    }

    setIsLoading(false)
    setIsModalOpen(false)
    setEditingArea(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this area?')) return
    const res = await deleteArea(id)
    if (res.success) {
      setAreas(areas.filter(a => a.id !== id))
    } else {
      alert(res.error)
    }
  }

  const openEditModal = (area: Area) => {
    setEditingArea(area)
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setEditingArea(null)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f1d33]">Areas</h1>
          <p className="mt-2 text-sm text-[#5a6a82]">
            Manage your operational areas for projects.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto bg-gradient-to-r from-[#c4a55a] to-[#d6b76c] text-white font-semibold rounded-lg shadow-lg shadow-[#c4a55a]/20 px-4 py-2 hover:opacity-90 transition-opacity"
        >
          + Add Area
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
            placeholder="Search areas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-[#e8ecf2] bg-white shadow-sm flex flex-col overflow-hidden h-[65vh] md:h-[75vh]">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-auto">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-[#f7f8fa] text-[#5a6a82] sticky top-0 z-10 border-b border-[#e8ecf2]">
              <tr>
                <th className="px-6 py-4 font-medium text-[#0f1d33] w-16">Sr.No.</th>
                <th className="px-6 py-4 font-medium text-[#0f1d33]">Name</th>
                <th className="px-6 py-4 font-medium text-[#0f1d33]">Date Added</th>
                <th className="px-6 py-4 font-medium text-[#0f1d33] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ecf2]">
              {filteredAreas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#5a6a82]">
                    No areas found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAreas.map((area, index) => (
                  <tr key={area.id} className="hover:bg-[#f7f8fa]/50 transition-colors">
                    <td className="px-6 py-4 text-[#5a6a82]">{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-[#1e3a5f]">{area.name}</td>
                    <td className="px-6 py-4 text-[#5a6a82]">
                      {new Date(area.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => openEditModal(area)}
                        className="text-[#1e3a5f] hover:underline font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(area.id)}
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
        <div className="md:hidden flex flex-col divide-y divide-[#e8ecf2] overflow-y-auto">
          {filteredAreas.length === 0 ? (
            <div className="p-8 text-center text-[#5a6a82]">
              No areas found matching your search.
            </div>
          ) : (
            filteredAreas.map((area, index) => (
              <div key={`mobile-area-${area.id}`} className="p-4 flex flex-col gap-3 hover:bg-[#f7f8fa]/50 transition-colors">
                <div className="flex justify-between items-center">
                  <div className="font-semibold text-[#1e3a5f] text-base">{area.name}</div>
                  <div className="text-xs text-[#5a6a82]">
                    {new Date(area.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-1 pt-3 border-t border-[#e8ecf2]">
                  <button
                    onClick={() => openEditModal(area)}
                    className="text-[#1e3a5f] hover:underline font-medium text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(area.id)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1d33]/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#e8ecf2] shadow-xl rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-[#0f1d33] mb-4">
              {editingArea ? 'Edit Area' : 'Add New Area'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0f1d33] mb-1">
                  Area Name
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingArea?.name || ''}
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  placeholder="e.g. Downtown, Northside..."
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-[#5a6a82] hover:bg-[#f3f5f8] rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[#c4a55a] to-[#d6b76c] text-white font-semibold rounded-lg shadow-lg shadow-[#c4a55a]/20 px-5 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save Area'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

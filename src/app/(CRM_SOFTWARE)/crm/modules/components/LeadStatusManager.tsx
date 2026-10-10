'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { 
  Tag, 
  Plus, 
  HelpCircle, 
  Edit2, 
  Trash2, 
  Shield, 
  AlertTriangle, 
  Check, 
  X, 
  Users, 
  Info,
  CheckCircle2,
  Lock,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  LeadStatus, 
  createLeadStatus, 
  updateLeadStatus, 
  deleteLeadStatus 
} from '../actions'

// Preset harmonious color palettes
export const STATUS_COLOR_PALETTES = [
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  { id: 'teal', label: 'Teal', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
  { id: 'rose', label: 'Rose / Red', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  { id: 'slate', label: 'Slate Gray', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' },
]

interface LeadStatusManagerProps {
  initialStatuses: LeadStatus[]
}

export default function LeadStatusManager({ initialStatuses }: LeadStatusManagerProps) {
  const [statuses, setStatuses] = useState<LeadStatus[]>(initialStatuses)
  const [isPending, startTransition] = useTransition()

  // Pagination State (10 per page)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(statuses.length / pageSize))
  const paginatedStatuses = statuses.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [statuses.length, totalPages, currentPage])

  // Guide Modal State
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null)
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState<number>(50)
  const [selectedPalette, setSelectedPalette] = useState(STATUS_COLOR_PALETTES[1]) // Default Blue
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete & Reassign Safe Modal State
  const [deletingStatus, setDeletingStatus] = useState<LeadStatus | null>(null)
  const [reassignToKey, setReassignToKey] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Open Create Modal
  const openCreateModal = () => {
    setEditingStatus(null)
    setName('')
    // Pick next logical sort order (highest + 10)
    const maxOrder = statuses.reduce((max, s) => Math.max(max, s.sort_order || 0), 0)
    setSortOrder(maxOrder + 10)
    setSelectedPalette(STATUS_COLOR_PALETTES[1])
    setFormError('')
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (st: LeadStatus) => {
    setEditingStatus(st)
    setName(st.name)
    setSortOrder(st.sort_order || 50)
    const matchingPalette = STATUS_COLOR_PALETTES.find(
      p => p.bg === st.color_bg && p.text === st.color_text
    ) || STATUS_COLOR_PALETTES[1]
    setSelectedPalette(matchingPalette)
    setFormError('')
    setIsModalOpen(true)
  }

  // Handle Form Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const trimmed = name.trim()

    if (!trimmed) {
      setFormError('Please enter a status name.')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingStatus) {
        // Update
        const res = await updateLeadStatus(editingStatus.id, {
          name: trimmed,
          color_bg: selectedPalette.bg,
          color_text: selectedPalette.text,
          color_border: selectedPalette.border,
          sort_order: Number(sortOrder)
        })

        if (!res.success) {
          setFormError(res.error || 'Failed to update status.')
          setIsSubmitting(false)
          return
        }

        setStatuses(prev => prev.map(s => s.id === editingStatus.id ? { ...s, ...res.data! } : s))
        toast.success('Lead status updated successfully', {
          description: `"${trimmed}" is now updated in CRM dropdowns.`
        })
      } else {
        // Create
        const res = await createLeadStatus({
          name: trimmed,
          color_bg: selectedPalette.bg,
          color_text: selectedPalette.text,
          color_border: selectedPalette.border,
          sort_order: Number(sortOrder)
        })

        if (!res.success) {
          setFormError(res.error || 'Failed to create status.')
          setIsSubmitting(false)
          return
        }

        setStatuses(prev => [...prev, { ...res.data!, leads_count: 0 }].sort((a, b) => a.sort_order - b.sort_order))
        toast.success('New lead status created', {
          description: `"${trimmed}" added to CRM pipeline.`
        })
      }

      setIsModalOpen(false)
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Initiate Delete with Guardrails
  const initiateDelete = (st: LeadStatus) => {
    if (st.is_system) {
      toast.error('System Protected Status', {
        description: `"${st.name}" is required by the CRM system and cannot be deleted.`
      })
      return
    }

    setDeletingStatus(st)
    setDeleteError('')

    // Pre-select first valid fallback status (e.g. 'new' or 'contacted')
    const fallback = statuses.find(s => s.id !== st.id && s.key !== st.key)
    setReassignToKey(fallback ? fallback.key : '')
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingStatus) return

    const count = deletingStatus.leads_count || 0
    if (count > 0 && !reassignToKey) {
      setDeleteError('Please choose a status to reassign existing leads to.')
      return
    }

    setIsDeleting(true)
    setDeleteError('')

    try {
      const res = await deleteLeadStatus(deletingStatus.id, count > 0 ? reassignToKey : undefined)

      if (!res.success) {
        setDeleteError(res.error || 'Failed to delete status.')
        setIsDeleting(false)
        return
      }

      // Update local state
      const targetFallbackName = statuses.find(s => s.key === reassignToKey)?.name || reassignToKey
      setStatuses(prev => {
        const filtered = prev.filter(s => s.id !== deletingStatus.id)
        if (count > 0 && reassignToKey) {
          return filtered.map(s => s.key === reassignToKey ? { ...s, leads_count: (s.leads_count || 0) + count } : s)
        }
        return filtered
      })

      if (count > 0) {
        toast.success(`Deleted "${deletingStatus.name}"`, {
          description: `Successfully reassigned ${count} lead(s) to "${targetFallbackName}".`
        })
      } else {
        toast.success(`Deleted "${deletingStatus.name}"`, {
          description: 'Status removed from CRM pipeline.'
        })
      }

      setDeletingStatus(null)
    } catch (err: any) {
      setDeleteError(err.message || 'An error occurred during deletion.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#e8ecf2] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#e8ecf2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#f3f5f8] rounded-lg text-[#1e3a5f]">
              <Tag className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-semibold text-[#0f1d33]">
              Lead Statuses & Pipeline Stages
            </h2>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="text-[#5a6a82] hover:text-[#1e3a5f] p-1 rounded-md transition-colors"
              title="View Architecture & Edge Cases Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-[#5a6a82] mt-1">
            Manage customizable stages, visual badge colors, and pipeline order shown in the Leads CRM table.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1e3a5f] bg-[#f3f5f8] hover:bg-[#e8ecf2] rounded-lg transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            How it works
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#152843] rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Status
          </button>
        </div>
      </div>

      {/* Statuses List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#e8ecf2] text-[11px] font-semibold text-[#5a6a82] uppercase tracking-wider">
              <th className="py-3 px-4">Order</th>
              <th className="py-3 px-4">Status & Badge</th>
              <th className="py-3 px-4">Active Leads</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8ecf2] text-sm">
            {statuses.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-[#5a6a82]">
                  No statuses configured yet. Click "Add Status" above.
                </td>
              </tr>
            ) : (
              paginatedStatuses.map((st) => (
                <tr key={st.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="py-3 px-4 text-xs font-mono text-[#5a6a82]">
                    #{st.sort_order}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${st.color_bg} ${st.color_text} ${st.color_border || 'border-transparent'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                      {st.name}
                      {st.is_system && (
                        <span title="System default status">
                          <Lock className="w-3 h-3 opacity-60 ml-0.5" />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${
                      (st.leads_count || 0) > 0 ? 'bg-[#f3f5f8] text-[#0f1d33]' : 'text-[#5a6a82]'
                    }`}>
                      <Users className="w-3.5 h-3.5 text-[#5a6a82]" />
                      {st.leads_count || 0} leads
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(st)}
                        className="p-1.5 text-[#5a6a82] hover:text-[#1e3a5f] hover:bg-[#f3f5f8] rounded-md transition-colors"
                        title="Edit Status"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {st.is_system ? (
                        <button
                          onClick={() => {
                            toast.info('Protected System Status', {
                              description: 'The "New" status is the intake default for incoming inquiries and cannot be deleted.'
                            })
                          }}
                          className="p-1.5 text-gray-300 cursor-not-allowed rounded-md"
                          title="System status cannot be deleted"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => initiateDelete(st)}
                          className="p-1.5 text-[#5a6a82] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Status"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar (10 per page) */}
      <div className="p-3.5 bg-white border-t border-[#e8ecf2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#5a6a82]">
        <div>
          {statuses.length > 0 ? (
            <span>
              Showing <span className="font-semibold text-[#0f1d33]">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold text-[#0f1d33]">{Math.min(currentPage * pageSize, statuses.length)}</span> of <span className="font-semibold text-[#0f1d33]">{statuses.length}</span> statuses
            </span>
          ) : (
            <span>0 statuses</span>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#e8ecf2] text-xs font-medium text-[#0f1d33] bg-white hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'text-[#5a6a82] hover:bg-[#f3f5f8] hover:text-[#0f1d33]'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#e8ecf2] text-xs font-medium text-[#0f1d33] bg-white hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Footer info bar */}
      <div className="p-3.5 bg-[#f8fafc] border-t border-[#e8ecf2] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#5a6a82] gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Statuses automatically sync across the Leads table, Mobile cards, and WhatsApp lead views.</span>
        </div>
        <div className="font-mono text-[11px]">
          Total Pipeline Stages: {statuses.length}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. ADD / EDIT STATUS MODAL */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-[#e8ecf2] max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-[#e8ecf2] flex items-center justify-between bg-[#f8fafc]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#1e3a5f]" />
                <h3 className="font-semibold text-[#0f1d33]">
                  {editingStatus ? 'Edit Lead Status' : 'Create New Lead Status'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#5a6a82] hover:text-[#0f1d33] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{formError}</div>
                </div>
              )}

              {/* Status Name */}
              <div>
                <label className="block text-xs font-semibold text-[#0f1d33] uppercase tracking-wider mb-1.5">
                  Status Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Site Visit Done, Follow Up Scheduled"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-[#e8ecf2] rounded-lg focus:outline-none focus:border-[#1e3a5f] bg-[#f8fafc] focus:bg-white transition-all"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-xs font-semibold text-[#0f1d33] uppercase tracking-wider mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 border border-[#e8ecf2] rounded-lg focus:outline-none focus:border-[#1e3a5f] bg-[#f8fafc] focus:bg-white transition-all"
                />
                <p className="text-[11px] text-[#5a6a82] mt-1">
                  Lower numbers appear first in the CRM status dropdown (e.g. 10, 20, 30...).
                </p>
              </div>

              {/* Color Palette Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#0f1d33] uppercase tracking-wider mb-1.5">
                  Badge Color Palette
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {STATUS_COLOR_PALETTES.map((palette) => {
                    const isSelected = selectedPalette.id === palette.id
                    return (
                      <button
                        type="button"
                        key={palette.id}
                        onClick={() => setSelectedPalette(palette)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
                          isSelected 
                            ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/20 bg-[#f8fafc]' 
                            : 'border-[#e8ecf2] hover:border-gray-300'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full ${palette.dot} mb-1`} />
                        <span className="text-[10px] text-[#5a6a82] capitalize">{palette.label.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Live Preview */}
              <div className="p-3 bg-[#f8fafc] border border-[#e8ecf2] rounded-lg">
                <span className="text-[11px] font-medium text-[#5a6a82] block mb-1.5">
                  Badge Preview in Leads Table:
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${selectedPalette.bg} ${selectedPalette.text} ${selectedPalette.border}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                  {name.trim() || 'Status Preview'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#e8ecf2]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-[#5a6a82] hover:text-[#0f1d33] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#152843] rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingStatus ? 'Save Changes' : 'Create Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SAFE DELETION & REASSIGNMENT MODAL */}
      {/* ======================================================== */}
      {deletingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-[#e8ecf2] max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-[#e8ecf2] flex items-center justify-between bg-red-50/50">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold text-[#0f1d33]">
                  Delete Status: {deletingStatus.name}
                </h3>
              </div>
              <button
                onClick={() => setDeletingStatus(null)}
                className="text-[#5a6a82] hover:text-[#0f1d33] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{deleteError}</div>
                </div>
              )}

              {/* Scenario A: Leads are currently assigned to this status */}
              {(deletingStatus.leads_count || 0) > 0 ? (
                <>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1.5">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Active Leads Detected ({deletingStatus.leads_count} Leads)
                    </p>
                    <p>
                      You cannot delete <strong>"{deletingStatus.name}"</strong> directly because <strong>{deletingStatus.leads_count} leads</strong> are currently in this stage.
                    </p>
                    <p className="text-[11px] text-amber-700">
                      To prevent broken lead records, please choose a fallback status to reassign these {deletingStatus.leads_count} leads before deleting:
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0f1d33] uppercase tracking-wider mb-1.5">
                      Reassign Active Leads To <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={reassignToKey}
                      onChange={(e) => setReassignToKey(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-[#e8ecf2] rounded-lg focus:outline-none focus:border-[#1e3a5f] bg-[#f8fafc] focus:bg-white"
                    >
                      {statuses
                        .filter(s => s.id !== deletingStatus.id && s.key !== deletingStatus.key)
                        .map(s => (
                          <option key={s.id} value={s.key}>
                            {s.name} ({s.leads_count || 0} leads currently)
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              ) : (
                /* Scenario B: 0 leads assigned */
                <p className="text-sm text-[#5a6a82]">
                  Are you sure you want to delete <strong>"{deletingStatus.name}"</strong>? 
                  There are currently 0 leads in this stage, so no leads will be affected.
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#e8ecf2]">
                <button
                  type="button"
                  onClick={() => setDeletingStatus(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-medium text-[#5a6a82] hover:text-[#0f1d33] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {(deletingStatus.leads_count || 0) > 0 
                    ? `Reassign & Delete` 
                    : 'Yes, Delete Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. IN-APP EDUCATIONAL GUIDE MODAL */}
      {/* ======================================================== */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-[#e8ecf2] max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-[#e8ecf2] flex items-center justify-between bg-[#f8fafc]">
              <div className="flex items-center gap-2 text-[#1e3a5f]">
                <Shield className="w-5 h-5" />
                <h3 className="font-semibold text-[#0f1d33]">
                  Lead Status Architecture & Guardrails
                </h3>
              </div>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="text-[#5a6a82] hover:text-[#0f1d33] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm text-[#0f1d33]">
              {/* Point 1: Deletion Safety */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-50 text-[#1e3a5f] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-[#1e3a5f] mb-1">
                    What happens if I delete an in-use status?
                  </h4>
                  <p className="text-xs text-[#5a6a82] leading-relaxed">
                    You never lose or corrupt lead data. If a status is currently assigned to any leads, the CRM prevents direct deletion and opens a <strong>Safe Reassignment Wizard</strong> asking you to choose a target status (e.g. "Contacted" or "Qualified") so all leads are cleanly migrated.
                  </p>
                </div>
              </div>

              {/* Point 2: System Protected Statuses */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-amber-700 mb-1">
                    Protected System Default Statuses
                  </h4>
                  <p className="text-xs text-[#5a6a82] leading-relaxed">
                    The <strong>"New"</strong> status is system-protected. All incoming inquiries from brochure downloads, layout downloads, contact forms, and ad webhooks are automatically tagged as "New". It cannot be deleted to guarantee incoming lead ingestion never fails.
                  </p>
                </div>
              </div>

              {/* Point 3: Phone Deduplication Sync */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-emerald-700 mb-1">
                    Multi-Inquiry Phone Synchronization
                  </h4>
                  <p className="text-xs text-[#5a6a82] leading-relaxed">
                    When a lead submits multiple forms (for example, Rani downloading a brochure for Vian Valley and also submitting a layout request), marking any one inquiry as <strong>"Contacted"</strong> automatically syncs all inquiries sharing that phone number to "Contacted", keeping the sales pipeline unified.
                  </p>
                </div>
              </div>

              {/* Point 4: Custom Badge Styling */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-purple-700 mb-1">
                    Color Consistency Across Devices
                  </h4>
                  <p className="text-xs text-[#5a6a82] leading-relaxed">
                    Every status uses a verified harmonious color palette that renders beautifully on desktop tables, mobile phone cards, WhatsApp chat overlays, and exported PDF reports.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#f8fafc] border-t border-[#e8ecf2] flex justify-end">
              <button
                onClick={() => setIsGuideOpen(false)}
                className="px-4 py-2 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#152843] rounded-lg transition-colors"
              >
                Got it, close guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

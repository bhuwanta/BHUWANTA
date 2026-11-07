'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Download, 
  X, 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  Check, 
  RotateCcw, 
  AlertTriangle, 
  Loader2,
  CheckSquare,
  Square
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  EXPORTABLE_COLUMNS, 
  ExportColumnDef, 
  exportLeadsToPDF, 
  exportLeadsToExcel, 
  exportLeadsToCSV 
} from '@/lib/reports/leads-export'

interface ExportLeadsModalProps {
  isOpen: boolean
  onClose: () => void
  leads: any[]
  selectedLeadIds?: string[]
  activeFiltersSummary?: string
}

export default function ExportLeadsModal({
  isOpen,
  onClose,
  leads,
  selectedLeadIds = [],
  activeFiltersSummary = ''
}: ExportLeadsModalProps) {
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf')
  const [scope, setScope] = useState<'filtered' | 'selected'>(
    selectedLeadIds.length > 0 ? 'selected' : 'filtered'
  )
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(() =>
    EXPORTABLE_COLUMNS.filter(c => c.defaultSelected).map(c => c.key)
  )
  const [isExporting, setIsExporting] = useState(false)
  const isExportingRef = useRef(false)

  // Sync scope if selectedLeadIds changes
  useEffect(() => {
    if (selectedLeadIds.length > 0) {
      setScope('selected')
    } else {
      setScope('filtered')
    }
  }, [selectedLeadIds.length])

  // Escape key listener & Body scroll locking
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Determine target leads based on scope
  const targetLeads = scope === 'selected' && selectedLeadIds.length > 0
    ? leads.filter(l => selectedLeadIds.includes(l.id))
    : leads

  const toggleColumn = (key: string) => {
    setSelectedColumnKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleSelectAll = () => {
    setSelectedColumnKeys(EXPORTABLE_COLUMNS.map(c => c.key))
  }

  const handleResetToDefault = () => {
    setSelectedColumnKeys(EXPORTABLE_COLUMNS.filter(c => c.defaultSelected).map(c => c.key))
  }

  const handleClearAll = () => {
    setSelectedColumnKeys([])
  }

  const handleExport = async () => {
    if (isExportingRef.current) return
    if (selectedColumnKeys.length === 0) {
      toast.error('Please select at least one column to export')
      return
    }
    if (targetLeads.length === 0) {
      toast.error('No leads to export in the selected scope')
      return
    }

    isExportingRef.current = true
    setIsExporting(true)

    try {
      const dateStr = new Date().toISOString().split('T')[0]
      const filePrefix = `bhuwanta_leads_${dateStr}`

      if (format === 'pdf') {
        const title = scope === 'selected' 
          ? `Selected Leads (${targetLeads.length})` 
          : 'CRM Leads Database'
        
        exportLeadsToPDF(targetLeads, selectedColumnKeys, `${filePrefix}.pdf`, {
          reportTitle: title,
          filterSummary: activeFiltersSummary
        })
        toast.success(`PDF exported successfully! (${targetLeads.length} leads)`)
      } else if (format === 'excel') {
        exportLeadsToExcel(targetLeads, selectedColumnKeys, `${filePrefix}.xlsx`, 'CRM Leads')
        toast.success(`Excel workbook exported successfully! (${targetLeads.length} leads)`)
      } else {
        exportLeadsToCSV(targetLeads, selectedColumnKeys, `${filePrefix}.csv`)
        toast.success(`CSV file exported successfully! (${targetLeads.length} leads)`)
      }

      onClose()
    } catch (err: any) {
      toast.error('Export failed', { description: err.message || 'An error occurred during export' })
    } finally {
      setTimeout(() => {
        isExportingRef.current = false
        setIsExporting(false)
      }, 500)
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-[#e8ecf2] overflow-hidden">
        
        {/* Sticky Header with Bhuwanta Gradient */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-[#002935] to-[#013847] border-b border-[#0f3d4d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <Download className="w-4 h-4 text-[#c4a55a]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Export CRM Leads
              </h3>
              <p className="text-[11px] text-[#94a3b8]">
                {targetLeads.length} lead{targetLeads.length === 1 ? '' : 's'} ready for export
                {activeFiltersSummary ? ` • ${activeFiltersSummary}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-[#0f1d33]">
          
          {/* Scope Selector (Only visible if rows are checked) */}
          {selectedLeadIds.length > 0 && (
            <div className="bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5a6a82] block mb-2">
                1. Select Export Scope
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope('selected')}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    scope === 'selected'
                      ? 'border-[#002935] bg-white text-[#002935] ring-1 ring-[#002935] font-semibold shadow-xs'
                      : 'border-[#cbd5e1] bg-white text-[#5a6a82] hover:border-[#94a3b8]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#002935]" />
                    <span>Selected Rows Only</span>
                  </div>
                  <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                    {selectedLeadIds.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('filtered')}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    scope === 'filtered'
                      ? 'border-[#002935] bg-white text-[#002935] ring-1 ring-[#002935] font-semibold shadow-xs'
                      : 'border-[#cbd5e1] bg-white text-[#5a6a82] hover:border-[#94a3b8]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Square className="w-4 h-4 text-[#5a6a82]" />
                    <span>All Filtered Leads</span>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 text-[#0f1d33] px-2 py-0.5 rounded-full font-bold">
                    {leads.length}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Format Selector */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5a6a82] block mb-2">
              {selectedLeadIds.length > 0 ? '2.' : '1.'} Choose File Format
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Option: PDF Document */}
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer ${
                  format === 'pdf'
                    ? 'border-[#002935] bg-[#f0f7f9] text-[#002935] ring-1 ring-[#002935] shadow-xs'
                    : 'border-[#e2e8f0] bg-white text-[#5a6a82] hover:border-[#cbd5e1]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center border border-red-100">
                      <FileText className="w-4 h-4 text-red-600" />
                    </div>
                    {format === 'pdf' && (
                      <span className="w-4 h-4 rounded-full bg-[#002935] flex items-center justify-center text-white">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-[#0f1d33]">PDF Document</div>
                  <div className="text-[11px] text-[#64748b] mt-0.5 leading-snug">
                    Publication-grade A4 report with executive headers & theme
                  </div>
                </div>
              </button>

              {/* Option: Excel Spreadsheet */}
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer ${
                  format === 'excel'
                    ? 'border-[#002935] bg-[#f0f7f9] text-[#002935] ring-1 ring-[#002935] shadow-xs'
                    : 'border-[#e2e8f0] bg-white text-[#5a6a82] hover:border-[#cbd5e1]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    </div>
                    {format === 'excel' && (
                      <span className="w-4 h-4 rounded-full bg-[#002935] flex items-center justify-center text-white">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-[#0f1d33]">Excel Workbook (.xlsx)</div>
                  <div className="text-[11px] text-[#64748b] mt-0.5 leading-snug">
                    Full spreadsheet with auto-width & string preserved phones
                  </div>
                </div>
              </button>

              {/* Option: CSV File */}
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer ${
                  format === 'csv'
                    ? 'border-[#002935] bg-[#f0f7f9] text-[#002935] ring-1 ring-[#002935] shadow-xs'
                    : 'border-[#e2e8f0] bg-white text-[#5a6a82] hover:border-[#cbd5e1]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                      <FileCode className="w-4 h-4 text-blue-600" />
                    </div>
                    {format === 'csv' && (
                      <span className="w-4 h-4 rounded-full bg-[#002935] flex items-center justify-center text-white">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-[#0f1d33]">CSV File (.csv)</div>
                  <div className="text-[11px] text-[#64748b] mt-0.5 leading-snug">
                    Standard comma-separated format for database & CRM import
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Column Checklist */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5a6a82] block">
                  {selectedLeadIds.length > 0 ? '3.' : '2.'} Select Columns to Include
                </span>
                <span className="text-[11px] text-[#64748b]">
                  {selectedColumnKeys.length} of {EXPORTABLE_COLUMNS.length} columns active
                </span>
              </div>

              {/* Convenience buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-1 text-[11px] font-semibold text-[#002935] hover:bg-[#f1f5f9] rounded-md transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-2 py-1 text-[11px] font-semibold text-[#002935] hover:bg-[#f1f5f9] rounded-md transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3 text-[#c4a55a]" />
                  Recommended
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2 py-1 text-[11px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
              {EXPORTABLE_COLUMNS.map((col: ExportColumnDef) => {
                const isChecked = selectedColumnKeys.includes(col.key)
                return (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-white border-[#cbd5e1] text-[#0f1d33] shadow-2xs font-medium'
                        : 'bg-[#f8fafc] border-transparent text-[#64748b] hover:bg-white hover:border-[#e2e8f0]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-[#cbd5e1] text-[#002935] focus:ring-0 cursor-pointer w-4 h-4"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs block truncate">{col.label}</span>
                    </div>
                  </label>
                )
              })}
            </div>

            {selectedColumnKeys.length === 0 && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Please select at least one column to generate an export.</span>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-[#64748b]">
            Target: <strong className="text-[#0f1d33] font-semibold">{targetLeads.length} leads</strong> • Format:{' '}
            <strong className="text-[#0f1d33] font-semibold uppercase">{format}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isExporting || selectedColumnKeys.length === 0 || targetLeads.length === 0}
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#002935] hover:bg-[#003847] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c4a55a]" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#c4a55a]" />
              )}
              <span>
                Export {format.toUpperCase()} ({targetLeads.length})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

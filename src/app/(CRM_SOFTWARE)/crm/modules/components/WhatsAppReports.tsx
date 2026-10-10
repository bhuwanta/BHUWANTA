'use client'

import React from 'react'
import { 
  MessageCircle, 
  Clock, 
  User, 
  Plus, 
  Loader2, 
  Users, 
  Smartphone, 
  X, 
  Send, 
  Trash2, 
  Edit2, 
  Check, 
  ChevronDown 
} from 'lucide-react'
import { WaRecipient } from '../actions'

// --- Internal Test Bar Component ---
interface InlineTestBarProps {
  type: 'email' | 'wa'
  target: string
  selectedTestHour: string
  onSelectTestHour: (hour: string) => void
  isExecutingTest: boolean
  onExecuteTest: (type: 'email' | 'wa', target: string) => void
  onClose: () => void
}

function InlineTestBar({
  type,
  target,
  selectedTestHour,
  onSelectTestHour,
  isExecutingTest,
  onExecuteTest,
  onClose
}: InlineTestBarProps) {
  return (
    <div className="mt-3 pt-3 border-t border-[#e8ecf2] space-y-2.5 bg-[#f8fafc] p-3 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#0f1d33] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#1e3a5f]" />
          Select Cron Slot to Simulate
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 p-0.5"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <select
            value={selectedTestHour}
            onChange={(e) => onSelectTestHour(e.target.value)}
            className="w-full appearance-none rounded-lg border border-[#cbd5e1] bg-white pl-3 pr-8 py-2 text-xs font-medium text-[#0f1d33] outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] cursor-pointer"
          >
            <option value="current">Current Real-Time (Live leads right now)</option>
            <option value="6">6:00 AM IST (Master Report - All-Time Database Leads)</option>
            <option value="9">9:00 AM IST (Window: 6:00 AM - 9:00 AM)</option>
            <option value="12">12:00 PM IST (Window: 9:00 AM - 12:00 PM)</option>
            <option value="15">3:00 PM IST (Window: 12:00 PM - 3:00 PM)</option>
            <option value="18">6:00 PM IST (Master Report - All-Time Database Leads)</option>
            <option value="21">9:00 PM IST (Window: 6:00 PM - 9:00 PM)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>

        <button
          type="button"
          disabled={isExecutingTest}
          onClick={() => onExecuteTest(type, target)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#0f1d33] rounded-lg transition-colors disabled:opacity-50 shrink-0"
        >
          {isExecutingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Send Test
        </button>
      </div>

      <p className="text-[11px] text-[#5a6a82] leading-relaxed">
        {selectedTestHour === '6' || selectedTestHour === '18'
          ? 'Master Slot: Generates the comprehensive Excel report containing all leads in the CRM database.'
          : selectedTestHour === 'current'
          ? 'Current Slot: Evaluates leads based on current live clock time.'
          : '3-Hour Delta Slot: Queries leads captured strictly within this 3-hour window.'}
      </p>
    </div>
  )
}

// --- WhatsApp Recipients Modal ---
interface WhatsAppRecipientsModalProps {
  isOpen: boolean
  onClose: () => void
  waRecipients: WaRecipient[]
  editingWaId: string | null
  editWaName: string
  setEditWaName: (name: string) => void
  editWaPhone: string
  setEditWaPhone: (phone: string) => void
  editWaTimings: string[]
  setEditWaTimings: (timings: string[]) => void
  isSavingWaEdit: boolean
  onStartEditWa: (recipient: WaRecipient) => void
  onSaveWaEdit: (id: string) => void
  onCancelEditWa: () => void
  testingRowId: string | null
  onToggleInlineTest: (id: string) => void
  selectedTestHour: string
  onSelectTestHour: (hour: string) => void
  isExecutingTest: boolean
  onExecuteInlineTest: (type: 'email' | 'wa', target: string) => void
  onCancelInlineTest: () => void
  deletingWaId: string | null
  onDeleteWa: (id: string, phone: string) => void
}

function WhatsAppRecipientsModal({
  isOpen,
  onClose,
  waRecipients,
  editingWaId,
  editWaName,
  setEditWaName,
  editWaPhone,
  setEditWaPhone,
  editWaTimings,
  setEditWaTimings,
  isSavingWaEdit,
  onStartEditWa,
  onSaveWaEdit,
  onCancelEditWa,
  testingRowId,
  onToggleInlineTest,
  selectedTestHour,
  onSelectTestHour,
  isExecutingTest,
  onExecuteInlineTest,
  onCancelInlineTest,
  deletingWaId,
  onDeleteWa
}: WhatsAppRecipientsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-hidden">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] md:max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#e8ecf2] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-[#0f1d33] text-lg">
                Manage WhatsApp Recipients
              </h3>
              <p className="text-xs text-[#5a6a82]">
                {waRecipients.length} Phone Numbers
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 pb-8 overflow-y-auto flex-1 space-y-3 bg-[#f8fafc] rounded-b-2xl">
          {waRecipients.length === 0 && (
            <div className="text-center py-10 border border-dashed border-[#e8ecf2] rounded-xl bg-white/60">
              <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No WhatsApp numbers configured yet.</p>
              <p className="text-xs text-gray-400 mt-1">Use the form on the modules page to add recipient phone numbers.</p>
            </div>
          )}

          {waRecipients.map((r) => {
            const formattedPhone = r.phone_number.startsWith('91') ? r.phone_number.slice(2) : r.phone_number
            const isEditing = editingWaId === r.id

            if (isEditing) {
              return (
                <div key={r.id} className="p-4 rounded-xl border-2 border-[#1e3a5f]/30 bg-white shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e8ecf2]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5" /> Edit Recipient
                    </span>
                    <button
                      type="button"
                      onClick={onCancelEditWa}
                      className="text-xs text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5a6a82] mb-1">Recipient Name</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={editWaName}
                          onChange={(e) => setEditWaName(e.target.value)}
                          placeholder="e.g. John Doe, Sales Head"
                          className="w-full text-xs rounded-lg border border-[#e8ecf2] bg-[#f8fafc] pl-8 pr-2.5 py-1.5 text-[#0f1d33] outline-none focus:border-[#1e3a5f] focus:bg-white"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5a6a82] mb-1">Phone Number (10 digits)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-semibold">
                          +91
                        </span>
                        <input
                          type="text"
                          maxLength={10}
                          value={editWaPhone}
                          onChange={(e) => setEditWaPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="9876543210"
                          className="w-full text-xs rounded-lg border border-[#e8ecf2] bg-[#f8fafc] pl-9 pr-2.5 py-1.5 text-[#0f1d33] outline-none focus:border-[#1e3a5f] focus:bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <label className="block text-[11px] font-semibold text-[#5a6a82] mb-1">
                      Report Timings <span className="text-[10px] text-gray-400 font-normal">(Select time slots to receive reports)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['6', '9', '12', '15', '18', '21'].map(time => {
                        const label = parseInt(time) <= 12 ? `${time} AM` : `${parseInt(time) - 12} PM`
                        const isSelected = editWaTimings.includes(time) || editWaTimings.length === 0
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => {
                              let newTimings = [...editWaTimings]
                              if (editWaTimings.length === 0) {
                                newTimings = ['6', '9', '12', '15', '18', '21'].filter(t => t !== time)
                              } else {
                                if (isSelected) {
                                  newTimings = newTimings.filter(t => t !== time)
                                } else {
                                  newTimings.push(time)
                                }
                              }
                              setEditWaTimings(newTimings)
                            }}
                            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                              isSelected 
                                ? 'bg-green-600 text-white border-green-600' 
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onCancelEditWa}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => onSaveWaEdit(r.id)}
                      disabled={isSavingWaEdit || editWaPhone.length !== 10}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {isSavingWaEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div key={r.id} className="p-3.5 sm:p-4 rounded-xl border border-[#e8ecf2] bg-white shadow-sm space-y-3 hover:border-gray-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center shrink-0 text-green-700 font-bold text-sm">
                      {r.name ? r.name.charAt(0).toUpperCase() : <User className="w-4 h-4 text-green-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#0f1d33] truncate">
                          {r.name || 'Unnamed Recipient'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#5a6a82] mt-0.5">
                        <Smartphone className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        <span className="font-mono font-medium">+91 {formattedPhone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onStartEditWa(r)}
                      className="inline-flex items-center justify-center gap-1 text-xs font-medium text-gray-700 hover:text-[#1e3a5f] px-2.5 py-1.5 rounded-lg border border-[#e8ecf2] hover:bg-gray-50 transition-colors"
                      title="Edit Name & Phone Number"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                      Edit
                    </button>
                    <button
                      onClick={() => onToggleInlineTest(r.id)}
                      className={`inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        testingRowId === r.id
                          ? 'bg-[#1e3a5f] text-white shadow-sm'
                          : 'text-[#c4a55a] hover:text-[#a38848] bg-[#c4a55a]/10 hover:bg-[#c4a55a]/20'
                      }`}
                      title="Test WhatsApp report for this recipient"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Test
                    </button>
                    <button
                      onClick={() => onDeleteWa(r.id, r.phone_number)}
                      disabled={deletingWaId === r.id}
                      className="inline-flex items-center justify-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                      title="Remove Recipient"
                    >
                      {deletingWaId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Remove
                    </button>
                  </div>
                </div>
                {testingRowId === r.id && (
                  <InlineTestBar
                    type="wa"
                    target={r.phone_number}
                    selectedTestHour={selectedTestHour}
                    onSelectTestHour={onSelectTestHour}
                    isExecutingTest={isExecutingTest}
                    onExecuteTest={onExecuteInlineTest}
                    onClose={onCancelInlineTest}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// --- Main WhatsAppReports Component ---
export interface WhatsAppReportsProps {
  recipientsCount: number
  newWaName: string
  setNewWaName: (name: string) => void
  newWaNumber: string
  setNewWaNumber: (number: string) => void
  isAddingWa: boolean
  onAddWa: (e: React.FormEvent) => void
  // Modal props
  isModalOpen: boolean
  onOpenModal: () => void
  onCloseModal: () => void
  waRecipients: WaRecipient[]
  editingWaId: string | null
  editWaName: string
  setEditWaName: (name: string) => void
  editWaPhone: string
  setEditWaPhone: (phone: string) => void
  editWaTimings: string[]
  setEditWaTimings: (timings: string[]) => void
  isSavingWaEdit: boolean
  onStartEditWa: (recipient: WaRecipient) => void
  onSaveWaEdit: (id: string) => void
  onCancelEditWa: () => void
  testingRowId: string | null
  onToggleInlineTest: (id: string) => void
  selectedTestHour: string
  onSelectTestHour: (hour: string) => void
  isExecutingTest: boolean
  onExecuteInlineTest: (type: 'email' | 'wa', target: string) => void
  onCancelInlineTest: () => void
  deletingWaId: string | null
  onDeleteWa: (id: string, phone: string) => void
}

export default function WhatsAppReports({
  recipientsCount,
  newWaName,
  setNewWaName,
  newWaNumber,
  setNewWaNumber,
  isAddingWa,
  onAddWa,
  isModalOpen,
  onOpenModal,
  onCloseModal,
  waRecipients,
  editingWaId,
  editWaName,
  setEditWaName,
  editWaPhone,
  setEditWaPhone,
  editWaTimings,
  setEditWaTimings,
  isSavingWaEdit,
  onStartEditWa,
  onSaveWaEdit,
  onCancelEditWa,
  testingRowId,
  onToggleInlineTest,
  selectedTestHour,
  onSelectTestHour,
  isExecutingTest,
  onExecuteInlineTest,
  onCancelInlineTest,
  deletingWaId,
  onDeleteWa
}: WhatsAppReportsProps) {
  return (
    <>
      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-[#0f1d33]">WhatsApp Report Recipients</h3>
              <p className="text-xs text-[#5a6a82]">Meta Cloud API Integration</p>
            </div>
          </div>
          
          <div className="text-sm text-[#5a6a82] mb-6 space-y-2">
            <p>
              Add 10-digit phone numbers below to receive automated Excel CRM reports on WhatsApp at the same time as emails.
            </p>
            <p className="font-medium text-[#1e3a5f] bg-[#f3f5f8] px-3 py-2 rounded-lg inline-block text-xs border border-[#e8ecf2]">
              <Clock className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              <strong>Schedule (IST):</strong> 6:00 AM, 9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM, and 9:00 PM
            </p>
          </div>

          <form onSubmit={onAddWa} className="space-y-3 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={newWaName}
                  onChange={(e) => setNewWaName(e.target.value)}
                  placeholder="Name (e.g. John Doe, Sales)"
                  className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] pl-9 pr-3 py-2 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                  +91
                </span>
                <input
                  type="text"
                  maxLength={10}
                  value={newWaNumber}
                  onChange={(e) => setNewWaNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] pl-10 pr-3 py-2 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isAddingWa || newWaNumber.length !== 10}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isAddingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add WhatsApp Recipient
            </button>
          </form>

          <button
            onClick={onOpenModal}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-[#e8ecf2] bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#1e3a5f] font-semibold text-sm transition-colors"
          >
            <Users className="w-4 h-4" />
            Manage Recipients ({recipientsCount})
          </button>
        </div>
      </div>

      {/* Recipient Modal */}
      <WhatsAppRecipientsModal
        isOpen={isModalOpen}
        onClose={onCloseModal}
        waRecipients={waRecipients}
        editingWaId={editingWaId}
        editWaName={editWaName}
        setEditWaName={setEditWaName}
        editWaPhone={editWaPhone}
        setEditWaPhone={setEditWaPhone}
        editWaTimings={editWaTimings}
        setEditWaTimings={setEditWaTimings}
        isSavingWaEdit={isSavingWaEdit}
        onStartEditWa={onStartEditWa}
        onSaveWaEdit={onSaveWaEdit}
        onCancelEditWa={onCancelEditWa}
        testingRowId={testingRowId}
        onToggleInlineTest={onToggleInlineTest}
        selectedTestHour={selectedTestHour}
        onSelectTestHour={onSelectTestHour}
        isExecutingTest={isExecutingTest}
        onExecuteInlineTest={onExecuteInlineTest}
        onCancelInlineTest={onCancelInlineTest}
        deletingWaId={deletingWaId}
        onDeleteWa={onDeleteWa}
      />
    </>
  )
}

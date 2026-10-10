'use client'

import React from 'react'
import { 
  Mail, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  Users, 
  User, 
  X, 
  Send, 
  Trash2, 
  Edit2, 
  Check, 
  ChevronDown 
} from 'lucide-react'
import { ReportRecipient } from '../actions'

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

// --- Email Recipients Modal ---
interface EmailRecipientsModalProps {
  isOpen: boolean
  onClose: () => void
  recipients: ReportRecipient[]
  editingEmailId: string | null
  editEmailName: string
  setEditEmailName: (name: string) => void
  editEmailAddress: string
  setEditEmailAddress: (email: string) => void
  editEmailTimings: string[]
  setEditEmailTimings: (timings: string[]) => void
  isSavingEmailEdit: boolean
  onStartEditEmail: (recipient: ReportRecipient) => void
  onSaveEmailEdit: (id: string) => void
  onCancelEditEmail: () => void
  testingRowId: string | null
  onToggleInlineTest: (id: string) => void
  selectedTestHour: string
  onSelectTestHour: (hour: string) => void
  isExecutingTest: boolean
  onExecuteInlineTest: (type: 'email' | 'wa', target: string) => void
  onCancelInlineTest: () => void
  deletingEmailId: string | null
  onDeleteEmail: (id: string, email: string) => void
}

function EmailRecipientsModal({
  isOpen,
  onClose,
  recipients,
  editingEmailId,
  editEmailName,
  setEditEmailName,
  editEmailAddress,
  setEditEmailAddress,
  editEmailTimings,
  setEditEmailTimings,
  isSavingEmailEdit,
  onStartEditEmail,
  onSaveEmailEdit,
  onCancelEditEmail,
  testingRowId,
  onToggleInlineTest,
  selectedTestHour,
  onSelectTestHour,
  isExecutingTest,
  onExecuteInlineTest,
  onCancelInlineTest,
  deletingEmailId,
  onDeleteEmail
}: EmailRecipientsModalProps) {
  if (!isOpen) return null

  const masterAdmin = recipients.find(r => r.email.toLowerCase() === 'bhuwanta9@gmail.com') || {
    id: 'master-admin-default',
    email: 'bhuwanta9@gmail.com',
    name: 'Master Admin',
    created_at: new Date().toISOString()
  }

  const otherRecipients = recipients.filter(r => r.email.toLowerCase() !== 'bhuwanta9@gmail.com')
  const totalCount = 1 + otherRecipients.length

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-hidden">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] md:max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#e8ecf2] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-[#0f1d33] text-lg">
                Manage Email Recipients
              </h3>
              <p className="text-xs text-[#5a6a82]">
                {totalCount} Email Addresses
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
          
          {/* Master Admin Card */}
          {editingEmailId === masterAdmin.id ? (
            <div className="p-4 rounded-xl border-2 border-[#c4a55a]/60 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#e8ecf2]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#c4a55a] flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5" /> Edit Master Admin Name
                </span>
                <button
                  type="button"
                  onClick={onCancelEditEmail}
                  className="text-xs text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5a6a82] mb-1">
                    Master Admin Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={editEmailName}
                      onChange={(e) => setEditEmailName(e.target.value)}
                      placeholder="e.g. Master Admin, Suroju Santosh"
                      className="w-full text-xs rounded-lg border border-[#e8ecf2] bg-[#f8fafc] pl-8 pr-2.5 py-2 text-[#0f1d33] outline-none focus:border-[#c4a55a] focus:bg-white"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5a6a82] mb-1">
                    Email Address <span className="text-[10px] text-gray-400 font-normal">(Primary System Email)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value="bhuwanta9@gmail.com"
                      disabled
                      className="w-full text-xs rounded-lg border border-gray-200 bg-gray-100 pl-8 pr-2.5 py-2 text-gray-500 cursor-not-allowed outline-none"
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
                    const isSelected = editEmailTimings.includes(time) || editEmailTimings.length === 0
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          let newTimings = [...editEmailTimings]
                          // if empty, it means all are selected. We must populate all EXCEPT the one being unselected
                          if (editEmailTimings.length === 0) {
                            newTimings = ['6', '9', '12', '15', '18', '21'].filter(t => t !== time)
                          } else {
                            if (isSelected) {
                              newTimings = newTimings.filter(t => t !== time)
                            } else {
                              newTimings.push(time)
                            }
                          }
                          setEditEmailTimings(newTimings)
                        }}
                        className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                          isSelected 
                            ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' 
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
                  onClick={onCancelEditEmail}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onSaveEmailEdit(masterAdmin.id)}
                  disabled={isSavingEmailEdit}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#c4a55a] hover:bg-[#b09451] rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSavingEmailEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 sm:p-4 rounded-xl border border-[#c4a55a] bg-[#c4a55a]/5 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[#c4a55a]/20 border border-[#c4a55a]/30 flex items-center justify-center text-[#c4a55a] font-bold text-sm shrink-0">
                    {masterAdmin.name ? masterAdmin.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#0f1d33] truncate">
                        {masterAdmin.name || 'Master Admin'}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#c4a55a] bg-white border border-[#c4a55a] px-2 py-0.5 rounded-full shrink-0">
                        Default
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#5a6a82] mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-[#c4a55a] shrink-0" />
                      <span className="break-all font-medium">{masterAdmin.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onStartEditEmail(masterAdmin)}
                    className="inline-flex items-center justify-center gap-1 text-xs font-medium text-gray-700 hover:text-[#1e3a5f] px-2.5 py-1.5 rounded-lg border border-[#e8ecf2] bg-white hover:bg-gray-50 transition-colors shadow-xs"
                    title="Edit Master Admin Name"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    Edit
                  </button>
                  <button
                    onClick={() => onToggleInlineTest(masterAdmin.id)}
                    className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors ${
                      testingRowId === masterAdmin.id
                        ? 'bg-[#1e3a5f] text-white shadow-sm'
                        : 'text-[#c4a55a] hover:text-[#a38848] bg-[#c4a55a]/10 hover:bg-[#c4a55a]/20'
                    }`}
                    title="Test email report for Master Admin"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Test
                  </button>
                  <button
                    disabled
                    title="Master admin cannot be removed."
                    className="inline-flex items-center justify-center gap-1 text-xs font-medium text-gray-400 px-2.5 py-1.5 rounded-lg bg-gray-100 cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
              {testingRowId === masterAdmin.id && (
                <InlineTestBar
                  type="email"
                  target={masterAdmin.email}
                  selectedTestHour={selectedTestHour}
                  onSelectTestHour={onSelectTestHour}
                  isExecutingTest={isExecutingTest}
                  onExecuteTest={onExecuteInlineTest}
                  onClose={onCancelInlineTest}
                />
              )}
            </div>
          )}

          {/* Empty state for custom recipients */}
          {otherRecipients.length === 0 && (
            <div className="text-center py-6 border border-dashed border-[#e8ecf2] rounded-xl bg-white/60">
              <Mail className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-medium">No additional email recipients added yet.</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Use the form on the modules page to verify and add more team recipients.</p>
            </div>
          )}

          {/* Custom Recipients List */}
          {otherRecipients.map((r) => {
            const isEditing = editingEmailId === r.id

            if (isEditing) {
              return (
                <div key={r.id} className="p-4 rounded-xl border-2 border-[#1e3a5f]/30 bg-white shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e8ecf2]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5" /> Edit Recipient
                    </span>
                    <button
                      type="button"
                      onClick={onCancelEditEmail}
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
                          value={editEmailName}
                          onChange={(e) => setEditEmailName(e.target.value)}
                          placeholder="e.g. John Doe, Sales Head"
                          className="w-full text-xs rounded-lg border border-[#e8ecf2] bg-[#f8fafc] pl-8 pr-2.5 py-2 text-[#0f1d33] outline-none focus:border-[#1e3a5f] focus:bg-white"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5a6a82] mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={editEmailAddress}
                          onChange={(e) => setEditEmailAddress(e.target.value)}
                          placeholder="name@company.com"
                          className="w-full text-xs rounded-lg border border-[#e8ecf2] bg-[#f8fafc] pl-8 pr-2.5 py-2 text-[#0f1d33] outline-none focus:border-[#1e3a5f] focus:bg-white"
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
                        const isSelected = editEmailTimings.includes(time) || editEmailTimings.length === 0
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => {
                              let newTimings = [...editEmailTimings]
                              if (editEmailTimings.length === 0) {
                                newTimings = ['6', '9', '12', '15', '18', '21'].filter(t => t !== time)
                              } else {
                                if (isSelected) {
                                  newTimings = newTimings.filter(t => t !== time)
                                } else {
                                  newTimings.push(time)
                                }
                              }
                              setEditEmailTimings(newTimings)
                            }}
                            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                              isSelected 
                                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' 
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
                      onClick={onCancelEditEmail}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => onSaveEmailEdit(r.id)}
                      disabled={isSavingEmailEdit || !editEmailAddress}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#1e3a5f] hover:bg-[#0f1d33] rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {isSavingEmailEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
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
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                      {r.name ? r.name.charAt(0).toUpperCase() : (r.email ? r.email.charAt(0).toUpperCase() : 'U')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#0f1d33] truncate">
                          {r.name || 'Unnamed Recipient'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#5a6a82] mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-medium break-all">{r.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onStartEditEmail(r)}
                      className="inline-flex items-center justify-center gap-1 text-xs font-medium text-gray-700 hover:text-[#1e3a5f] px-2.5 py-1.5 rounded-lg border border-[#e8ecf2] hover:bg-gray-50 transition-colors"
                      title="Edit Name & Email"
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
                      title="Test email report for this recipient"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Test
                    </button>
                    <button
                      onClick={() => onDeleteEmail(r.id, r.email)}
                      disabled={deletingEmailId === r.id}
                      className="inline-flex items-center justify-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                      title="Remove Recipient"
                    >
                      {deletingEmailId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Remove
                    </button>
                  </div>
                </div>
                {testingRowId === r.id && (
                  <InlineTestBar
                    type="email"
                    target={r.email}
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

// --- Main AutomatedReportsEmail Component ---
export interface AutomatedReportsEmailProps {
  recipients: ReportRecipient[]
  newName: string
  setNewName: (name: string) => void
  newEmail: string
  setNewEmail: (email: string) => void
  isSendingOtp: boolean
  showOtpField: boolean
  setShowOtpField: (show: boolean) => void
  otpCode: string
  setOtpCode: (code: string) => void
  isVerifying: boolean
  onSendOtp: (e: React.FormEvent) => void
  onVerifyOtp: (e: React.FormEvent) => void
  // Modal props
  isModalOpen: boolean
  onOpenModal: () => void
  onCloseModal: () => void
  editingEmailId: string | null
  editEmailName: string
  setEditEmailName: (name: string) => void
  editEmailAddress: string
  setEditEmailAddress: (email: string) => void
  editEmailTimings: string[]
  setEditEmailTimings: (timings: string[]) => void
  isSavingEmailEdit: boolean
  onStartEditEmail: (recipient: ReportRecipient) => void
  onSaveEmailEdit: (id: string) => void
  onCancelEditEmail: () => void
  testingRowId: string | null
  onToggleInlineTest: (id: string) => void
  selectedTestHour: string
  onSelectTestHour: (hour: string) => void
  isExecutingTest: boolean
  onExecuteInlineTest: (type: 'email' | 'wa', target: string) => void
  onCancelInlineTest: () => void
  deletingEmailId: string | null
  onDeleteEmail: (id: string, email: string) => void
}

export default function AutomatedReportsEmail({
  recipients,
  newName,
  setNewName,
  newEmail,
  setNewEmail,
  isSendingOtp,
  showOtpField,
  setShowOtpField,
  otpCode,
  setOtpCode,
  isVerifying,
  onSendOtp,
  onVerifyOtp,
  isModalOpen,
  onOpenModal,
  onCloseModal,
  editingEmailId,
  editEmailName,
  setEditEmailName,
  editEmailAddress,
  setEditEmailAddress,
  editEmailTimings,
  setEditEmailTimings,
  isSavingEmailEdit,
  onStartEditEmail,
  onSaveEmailEdit,
  onCancelEditEmail,
  testingRowId,
  onToggleInlineTest,
  selectedTestHour,
  onSelectTestHour,
  isExecutingTest,
  onExecuteInlineTest,
  onCancelInlineTest,
  deletingEmailId,
  onDeleteEmail
}: AutomatedReportsEmailProps) {
  const hasMaster = recipients.some(r => r.email.toLowerCase() === 'bhuwanta9@gmail.com')
  const totalCount = hasMaster ? recipients.length : recipients.length + 1

  return (
    <>
      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-[#0f1d33]">Automated Report Emails</h3>
              <p className="text-xs text-[#5a6a82]">Resend Mail Integration</p>
            </div>
          </div>
          
          <div className="text-sm text-[#5a6a82] mb-6 space-y-2">
            <p>
              Add email addresses below to receive automated PDF and Excel CRM reports at scheduled intervals.
            </p>
            <p className="font-medium text-[#1e3a5f] bg-[#f3f5f8] px-3 py-2 rounded-lg inline-block text-xs border border-[#e8ecf2]">
              <Clock className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              <strong>Schedule (IST):</strong> 6:00 AM, 9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM, and 9:00 PM
            </p>
          </div>

          {!showOtpField ? (
            <form onSubmit={onSendOtp} className="space-y-3 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name (e.g. John Doe, Admin)"
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] pl-9 pr-3 py-2 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  />
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] pl-9 pr-3 py-2 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSendingOtp || !newEmail}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0f1d33] disabled:opacity-50 transition-colors"
              >
                {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Verify & Add Email Recipient
              </button>
            </form>
          ) : (
            <div className="bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg p-4 mb-6">
              <div className="flex justify-between items-start mb-3">
                <p className="text-sm font-medium text-[#0f1d33]">
                  Enter the 6-digit code sent to <strong className="text-[#1e3a5f]">{newEmail}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpField(false)
                    setOtpCode('')
                  }}
                  className="text-xs text-[#1e3a5f] underline hover:text-[#0f1d33]"
                >
                  Change Email
                </button>
              </div>
              <form onSubmit={onVerifyOtp} className="flex gap-3">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="flex-1 rounded-lg border border-[#e8ecf2] bg-white px-3 py-2 text-center tracking-widest text-lg font-bold text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  required
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isVerifying || otpCode.length !== 6}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#c4a55a] px-4 py-2 text-sm font-bold text-white hover:bg-[#b09451] disabled:opacity-50 transition-colors"
                  >
                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpField(false)
                      setOtpCode('')
                      setNewEmail('')
                      setNewName('')
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-[#e8ecf2] bg-white px-3 py-2 text-sm font-medium text-[#5a6a82] hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <button
            onClick={onOpenModal}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-[#e8ecf2] bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#1e3a5f] font-semibold text-sm transition-colors"
          >
            <Users className="w-4 h-4" />
            Manage Recipients ({totalCount})
          </button>
        </div>
      </div>

      {/* Recipient Modal */}
      <EmailRecipientsModal
        isOpen={isModalOpen}
        onClose={onCloseModal}
        recipients={recipients}
        editingEmailId={editingEmailId}
        editEmailName={editEmailName}
        setEditEmailName={setEditEmailName}
        editEmailAddress={editEmailAddress}
        setEditEmailAddress={setEditEmailAddress}
        editEmailTimings={editEmailTimings}
        setEditEmailTimings={setEditEmailTimings}
        isSavingEmailEdit={isSavingEmailEdit}
        onStartEditEmail={onStartEditEmail}
        onSaveEmailEdit={onSaveEmailEdit}
        onCancelEditEmail={onCancelEditEmail}
        testingRowId={testingRowId}
        onToggleInlineTest={onToggleInlineTest}
        selectedTestHour={selectedTestHour}
        onSelectTestHour={onSelectTestHour}
        isExecutingTest={isExecutingTest}
        onExecuteInlineTest={onExecuteInlineTest}
        onCancelInlineTest={onCancelInlineTest}
        deletingEmailId={deletingEmailId}
        onDeleteEmail={onDeleteEmail}
      />
    </>
  )
}

'use client'

import React from 'react'
import { Mail, X, Send, Trash2, Loader2, User, Edit2, Check } from 'lucide-react'
import { ReportRecipient } from '../actions'
import InlineTestBar from './InlineTestBar'

interface EmailRecipientsModalProps {
  isOpen: boolean
  onClose: () => void
  recipients: ReportRecipient[]
  editingEmailId: string | null
  editEmailName: string
  setEditEmailName: (name: string) => void
  editEmailAddress: string
  setEditEmailAddress: (email: string) => void
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

export default function EmailRecipientsModal({
  isOpen,
  onClose,
  recipients,
  editingEmailId,
  editEmailName,
  setEditEmailName,
  editEmailAddress,
  setEditEmailAddress,
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

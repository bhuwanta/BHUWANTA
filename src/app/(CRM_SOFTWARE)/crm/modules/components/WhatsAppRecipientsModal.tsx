'use client'

import React from 'react'
import { MessageCircle, X, User, Smartphone, Edit2, Send, Trash2, Check, Loader2 } from 'lucide-react'
import { WaRecipient } from '../actions'
import InlineTestBar from './InlineTestBar'

interface WhatsAppRecipientsModalProps {
  isOpen: boolean
  onClose: () => void
  waRecipients: WaRecipient[]
  editingWaId: string | null
  editWaName: string
  setEditWaName: (name: string) => void
  editWaPhone: string
  setEditWaPhone: (phone: string) => void
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

export default function WhatsAppRecipientsModal({
  isOpen,
  onClose,
  waRecipients,
  editingWaId,
  editWaName,
  setEditWaName,
  editWaPhone,
  setEditWaPhone,
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
            <div className="text-center py-10">
              <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No WhatsApp numbers configured yet.</p>
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
              <div key={r.id} className="p-3.5 rounded-xl border border-[#e8ecf2] bg-white shadow-sm space-y-3 hover:border-gray-300 transition-colors">
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
                          ? 'bg-[#1e3a5f] text-white'
                          : 'text-[#c4a55a] hover:text-[#a38848] bg-[#c4a55a]/10 hover:bg-[#c4a55a]/20'
                      }`}
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

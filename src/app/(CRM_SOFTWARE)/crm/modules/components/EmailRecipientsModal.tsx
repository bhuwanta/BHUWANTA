'use client'

import React from 'react'
import { Mail, X, Send, Trash2, Loader2 } from 'lucide-react'
import { ReportRecipient } from '../actions'
import InlineTestBar from './InlineTestBar'

interface EmailRecipientsModalProps {
  isOpen: boolean
  onClose: () => void
  recipients: ReportRecipient[]
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-hidden">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90dvh] md:max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#e8ecf2] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f3f5f8] flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-[#1e3a5f]" />
            </div>
            <div>
              <h3 className="font-bold text-[#0f1d33] text-lg">
                Manage Email Recipients
              </h3>
              <p className="text-xs text-[#5a6a82]">
                {recipients.length + 1} Addresses
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
        <div className="p-5 pb-8 overflow-y-auto flex-1 space-y-3 bg-[#f8fafc] rounded-b-2xl">
          {/* Default Master Admin Email */}
          <div className="p-3.5 rounded-xl border border-[#c4a55a] bg-[#c4a55a]/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#c4a55a]/20 flex items-center justify-center text-[#c4a55a] font-bold text-xs">
                  A
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#0f1d33] break-all">bhuwanta9@gmail.com</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#c4a55a] bg-white border border-[#c4a55a] px-2 py-0.5 rounded-full">Default</span>
                  </div>
                  <span className="text-xs text-[#5a6a82]">Master Admin</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onToggleInlineTest('default-1')}
                  className={`inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors ${
                    testingRowId === 'default-1'
                      ? 'bg-[#1e3a5f] text-white'
                      : 'text-[#c4a55a] hover:text-[#a38848] bg-[#c4a55a]/10 hover:bg-[#c4a55a]/20'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Test
                </button>
                <button
                  disabled
                  title="Master admin cannot be removed."
                  className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 text-xs font-medium text-gray-400 px-3 py-1.5 rounded-lg bg-gray-100 cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </div>
            {testingRowId === 'default-1' && (
              <InlineTestBar
                type="email"
                target="bhuwanta9@gmail.com"
                selectedTestHour={selectedTestHour}
                onSelectTestHour={onSelectTestHour}
                isExecutingTest={isExecutingTest}
                onExecuteTest={onExecuteInlineTest}
                onClose={onCancelInlineTest}
              />
            )}
          </div>

          {/* Custom Recipients */}
          {recipients.map((r) => (
            <div key={r.id} className="p-3.5 rounded-xl border border-[#e8ecf2] bg-white shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-[#f3f5f8] flex items-center justify-center text-[#1e3a5f] font-bold text-xs shrink-0">
                    {r.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[#0f1d33] break-all">{r.email}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onToggleInlineTest(r.id)}
                    className={`inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors ${
                      testingRowId === r.id
                        ? 'bg-[#1e3a5f] text-white'
                        : 'text-[#c4a55a] hover:text-[#a38848] bg-[#c4a55a]/10 hover:bg-[#c4a55a]/20'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Test
                  </button>
                  <button
                    onClick={() => onDeleteEmail(r.id, r.email)}
                    disabled={deletingEmailId === r.id}
                    className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
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
          ))}
        </div>
      </div>
    </div>
  )
}

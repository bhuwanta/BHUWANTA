'use client'

import React from 'react'
import { MessageCircle, Clock, User, Plus, Loader2, Users } from 'lucide-react'

interface WhatsAppReportsModuleProps {
  recipientsCount: number
  newWaName: string
  setNewWaName: (name: string) => void
  newWaNumber: string
  setNewWaNumber: (number: string) => void
  isAddingWa: boolean
  onAddWa: (e: React.FormEvent) => void
  onOpenManageModal: () => void
}

export default function WhatsAppReportsModule({
  recipientsCount,
  newWaName,
  setNewWaName,
  newWaNumber,
  setNewWaNumber,
  isAddingWa,
  onAddWa,
  onOpenManageModal
}: WhatsAppReportsModuleProps) {
  return (
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
          onClick={onOpenManageModal}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-[#e8ecf2] bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#1e3a5f] font-semibold text-sm transition-colors"
        >
          <Users className="w-4 h-4" />
          Manage Recipients ({recipientsCount})
        </button>
      </div>
    </div>
  )
}

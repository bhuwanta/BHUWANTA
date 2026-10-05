'use client'

import React from 'react'
import { Mail, Clock, ShieldCheck, CheckCircle2, Loader2, Users, User } from 'lucide-react'

interface EmailReportsModuleProps {
  recipientsCount: number
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
  onOpenManageModal: () => void
}

export default function EmailReportsModule({
  recipientsCount,
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
  onOpenManageModal
}: EmailReportsModuleProps) {
  return (
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

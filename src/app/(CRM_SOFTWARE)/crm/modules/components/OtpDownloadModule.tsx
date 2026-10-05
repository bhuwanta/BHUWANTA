'use client'

import React from 'react'
import { KeyRound, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface OtpDownloadModuleProps {
  otpEnabled: boolean
  isPending: boolean
  onToggleOtp: (nextState: boolean) => void
}

export default function OtpDownloadModule({
  otpEnabled,
  isPending,
  onToggleOtp
}: OtpDownloadModuleProps) {
  return (
    <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f3f5f8] flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-[#1e3a5f]" />
            </div>
            <div>
              <h3 className="font-bold text-[#0f1d33]">Website Downloads OTP</h3>
              <p className="text-xs text-[#5a6a82]">Manage lead verification for downloads</p>
            </div>
          </div>

          {otpEnabled ? (
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Enabled
            </span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-1 rounded font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-gray-500" /> Disabled
            </span>
          )}
        </div>

        <p className="text-sm text-[#5a6a82] mb-6">
          When enabled, visitors must verify via phone SMS OTP to download brochures or guides. When disabled, downloads open directly without asking for phone, name, or OTP.
        </p>
      </div>

      <div className="pt-4 border-t border-[#e8ecf2] flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#0f1d33]">
          Module Status
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={otpEnabled}
          disabled={isPending}
          onClick={() => onToggleOtp(!otpEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] disabled:cursor-not-allowed disabled:opacity-50 ${
            otpEnabled ? 'bg-emerald-600' : 'bg-[#d1d5db]'
          }`}
        >
          <span className="sr-only">Toggle Website Downloads OTP</span>
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
              otpEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin text-[#5a6a82]" />}
          </span>
        </button>
      </div>
    </div>
  )
}

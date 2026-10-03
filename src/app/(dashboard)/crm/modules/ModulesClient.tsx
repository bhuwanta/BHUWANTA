'use client'

import { useState, useTransition } from 'react'
import {
  Blocks,
  KeyRound,
  MessageCircle,
  Mail,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { toggleOtpModuleStatus } from './actions'

interface ModulesClientProps {
  initialOtpEnabled: boolean
}

export default function ModulesClient({ initialOtpEnabled }: ModulesClientProps) {
  const [otpEnabled, setOtpEnabled] = useState(initialOtpEnabled)
  const [isPending, startTransition] = useTransition()

  const handleToggleOtp = (nextState: boolean) => {
    const prevState = otpEnabled
    setOtpEnabled(nextState)

    startTransition(async () => {
      try {
        const result = await toggleOtpModuleStatus(nextState)
        if (result.success) {
          setOtpEnabled(result.downloadOtpEnabled)
          if (result.downloadOtpEnabled) {
            toast.success('Website Downloads OTP Enabled', {
              description: 'Brochure and layout downloads now require SMS OTP verification.',
            })
          } else {
            toast.warning('Website Downloads OTP Disabled', {
              description: 'Downloads will open directly without asking for phone, name, or OTP.',
            })
          }
        } else {
          setOtpEnabled(prevState)
          toast.error('Failed to update setting', {
            description: result.error || 'Please try again.',
          })
        }
      } catch {
        setOtpEnabled(prevState)
        toast.error('Network error', {
          description: 'Could not communicate with the server.',
        })
      }
    })
  }

  return (
    <div className="p-1 md:p-2 h-full flex flex-col relative">
      {/* Header */}
      <div className="flex flex-col mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
          <Blocks className="w-6 h-6 text-[#c4a55a]" />
          Modules
        </h1>
        <p className="text-[#5a6a82] text-sm mt-1">
          Configure and manage CRM system modules and public website controls.
        </p>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module 1: Website Downloads OTP (Interactive Toggle) */}
        <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f3f5f8] flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5 text-[#1e3a5f]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0f1d33]">Website Downloads OTP</h3>
                  <p className="text-xs text-[#5a6a82]">Key: otp_download_enabled</p>
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
              onClick={() => handleToggleOtp(!otpEnabled)}
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

        {/* Module 2: WhatsApp Lead Sync */}
        <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f3f5f8] flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-[#1e3a5f]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0f1d33]">WhatsApp Sync</h3>
                  <p className="text-xs text-[#5a6a82]">Key: whatsapp_lead_sync</p>
                </div>
              </div>

              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            </div>

            <p className="text-sm text-[#5a6a82] mb-6">
              Automatically routes incoming website leads into the CRM WhatsApp inbox with telecaller assignment and instant response triggers.
            </p>
          </div>

          <div className="pt-4 border-t border-[#e8ecf2] flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0f1d33]">
              Module Status
            </span>
            <span className="text-xs text-[#5a6a82] font-medium">Core System</span>
          </div>
        </div>

        {/* Module 3: Email Autoresponder */}
        <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f3f5f8] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#1e3a5f]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0f1d33]">Email Autoresponder</h3>
                  <p className="text-xs text-[#5a6a82]">Key: email_autoresponder</p>
                </div>
              </div>

              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Resend
              </span>
            </div>

            <p className="text-sm text-[#5a6a82] mb-6">
              Dispatches automated branded welcome emails with downloadable project brochures and attachments managed through Sanity CMS.
            </p>
          </div>

          <div className="pt-4 border-t border-[#e8ecf2] flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0f1d33]">
              Module Status
            </span>
            <span className="text-xs text-[#5a6a82] font-medium">Core System</span>
          </div>
        </div>

        {/* Module 4: Anti-Spam Rate Limiter */}
        <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f3f5f8] flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-[#1e3a5f]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0f1d33]">Anti-Spam Limiter</h3>
                  <p className="text-xs text-[#5a6a82]">Key: redis_rate_limiter</p>
                </div>
              </div>

              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Redis
              </span>
            </div>

            <p className="text-sm text-[#5a6a82] mb-6">
              Enforces a sliding-window rate limit (5 requests per hour per IP) via Upstash Redis to prevent bot scraping and denial-of-service abuse.
            </p>
          </div>

          <div className="pt-4 border-t border-[#e8ecf2] flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0f1d33]">
              Module Status
            </span>
            <span className="text-xs text-[#5a6a82] font-medium">5 req/hr sliding</span>
          </div>
        </div>
      </div>
    </div>
  )
}

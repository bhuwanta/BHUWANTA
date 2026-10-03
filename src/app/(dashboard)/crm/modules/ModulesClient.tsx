'use client'

import { useState, useTransition } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  FileText,
  Map,
  FileCheck2,
  BookOpen,
  ExternalLink,
  Loader2,
  Database,
  Users,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { toggleOtpModuleStatus } from './actions'

interface ModulesClientProps {
  initialOtpEnabled: boolean
}

export default function ModulesClient({ initialOtpEnabled }: ModulesClientProps) {
  const [otpEnabled, setOtpEnabled] = useState(initialOtpEnabled)
  const [isPending, startTransition] = useTransition()
  const [lastUpdated, setLastUpdated] = useState<string>('Just now')

  const handleToggle = (nextState: boolean) => {
    // Optimistic update
    const prevState = otpEnabled
    setOtpEnabled(nextState)

    startTransition(async () => {
      try {
        const result = await toggleOtpModuleStatus(nextState)
        if (result.success) {
          setOtpEnabled(result.downloadOtpEnabled)
          setLastUpdated(new Date().toLocaleTimeString())
          if (result.downloadOtpEnabled) {
            toast.success('Download OTP Verification Enabled', {
              description: 'Public downloads now require 6-digit phone OTP verification.',
            })
          } else {
            toast.warning('Download OTP Verification Disabled', {
              description: 'Public downloads will unlock immediately without asking for OTP.',
            })
          }
        } else {
          // Revert on failure
          setOtpEnabled(prevState)
          toast.error('Failed to update setting', {
            description: result.error || 'Please try again later.',
          })
        }
      } catch (err) {
        setOtpEnabled(prevState)
        toast.error('Network error', {
          description: 'Could not communicate with the server.',
        })
      }
    })
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e8ecf2] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#c4a55a]">
              System Configuration
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-[#5a6a82]">Global Modules</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0f1d33]">
            Modules & Feature Controls
          </h1>
          <p className="mt-1.5 text-sm text-[#5a6a82] max-w-2xl">
            Configure dynamic website behaviors, lead gate policies, and security verification modules in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#e8ecf2] bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-[#0f1d33] hover:bg-[#f3f5f8] shadow-sm transition-all"
          >
            <span>Preview Website</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#5a6a82]" />
          </a>
        </div>
      </div>

      {/* KPI / Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl border border-[#e8ecf2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5a6a82]">
              Download OTP Gate
            </span>
            <div
              className={`p-2 rounded-lg ${
                otpEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {otpEnabled ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-xl sm:text-2xl font-bold ${
                otpEnabled ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {otpEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <span className="text-xs text-[#5a6a82]">
              {otpEnabled ? '(SMS Verification On)' : '(Instant Downloads)'}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#5a6a82]">
            {otpEnabled
              ? 'Users must verify phone number via SMS OTP.'
              : 'Users download immediately without SMS OTP.'}
          </p>
        </div>

        <div className="rounded-xl border border-[#e8ecf2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5a6a82]">
              Lead Capture Sync
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-[#1e3a5f]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-[#0f1d33]">Active</span>
            <span className="text-xs text-emerald-600 font-medium">● Online</span>
          </div>
          <p className="mt-2 text-xs text-[#5a6a82]">
            Contact info is captured into CRM regardless of OTP state.
          </p>
        </div>

        <div className="rounded-xl border border-[#e8ecf2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5a6a82]">
              State Persistence
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Database className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-[#0f1d33]">Redis Cloud</span>
            <span className="text-xs text-[#5a6a82]">Key-Value Store</span>
          </div>
          <p className="mt-2 text-xs text-[#5a6a82]">
            Updated {lastUpdated}. Instant sync across edge servers.
          </p>
        </div>
      </div>

      {/* Featured Primary Module Card: OTP Verification */}
      <div className="rounded-2xl border-2 border-[#1e3a5f]/15 bg-white shadow-sm overflow-hidden">
        {/* Module Header Bar */}
        <div className="bg-gradient-to-r from-[#0f1d33] to-[#1e3a5f] p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#c4a55a] to-[#a68638] flex items-center justify-center text-white shadow-md">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  Website Downloads OTP Verification
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3 text-[#c4a55a]" /> Core Module
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/70 mt-0.5">
                Controls whether phone number OTP verification is required before visitors can download documents.
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {otpEnabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                OTP Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                OTP Bypassed
              </span>
            )}
          </div>
        </div>

        {/* Module Body */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Main Toggle Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 sm:p-6 rounded-xl bg-[#f7f8fa] border border-[#e8ecf2]">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="otp-toggle"
                  className="text-base sm:text-lg font-bold text-[#0f1d33] cursor-pointer"
                >
                  Require OTP for Document Downloads
                </label>
                {isPending && <Loader2 className="h-4 w-4 animate-spin text-[#c4a55a]" />}
              </div>
              <p className="text-sm text-[#5a6a82] leading-relaxed">
                {otpEnabled ? (
                  <span className="text-emerald-800 font-medium">
                    ✓ Currently ENABLED: Visitors must enter their phone number and verify via 6-digit SMS OTP code before downloading any project brochure, layout, or guide.
                  </span>
                ) : (
                  <span className="text-amber-800 font-medium">
                    ⚠ Currently DISABLED: Visitors can download documents directly without being asked for name, phone number, or OTP verification.
                  </span>
                )}
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5a6a82]">
                {otpEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                id="otp-toggle"
                type="button"
                role="switch"
                aria-checked={otpEnabled}
                disabled={isPending}
                onClick={() => handleToggle(!otpEnabled)}
                className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  otpEnabled ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <span className="sr-only">Toggle OTP verification</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                    otpEnabled ? 'translate-x-8' : 'translate-x-0'
                  }`}
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#5a6a82]" />
                  ) : otpEnabled ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Affected Flows Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0f1d33] flex items-center gap-2">
              <Info className="h-4 w-4 text-[#c4a55a]" />
              Workflows & Components Governed by this Toggle
            </h3>
            <p className="text-xs text-[#5a6a82]">
              Switching this toggle applies immediately across the following public components:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-[#e8ecf2] bg-white hover:border-[#c4a55a]/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-[#1e3a5f]/10 text-[#1e3a5f]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-sm text-[#0f1d33]">Project Brochures</span>
                </div>
                <p className="text-xs text-[#5a6a82] leading-normal">
                  All individual project PDF brochures on `/projects/[slug]` and listing filter.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#e8ecf2] bg-white hover:border-[#c4a55a]/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-[#c4a55a]/10 text-[#c4a55a]">
                    <Map className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-sm text-[#0f1d33]">Master Layouts</span>
                </div>
                <p className="text-xs text-[#5a6a82] leading-normal">
                  High-resolution master layout plans and plot availability maps.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#e8ecf2] bg-white hover:border-[#c4a55a]/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <FileCheck2 className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-sm text-[#0f1d33]">RERA & Approvals</span>
                </div>
                <p className="text-xs text-[#5a6a82] leading-normal">
                  HMDA, DTCP, and RERA approval documents and legal certificates.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#e8ecf2] bg-white hover:border-[#c4a55a]/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-sm text-[#0f1d33]">Gated Guides</span>
                </div>
                <p className="text-xs text-[#5a6a82] leading-normal">
                  Plot Buyer Legal Checklists and NH-44 Growth Corridor Investment Maps.
                </p>
              </div>
            </div>
          </div>

          {/* Behavior Comparison Table */}
          <div className="rounded-xl border border-[#e8ecf2] overflow-hidden">
            <div className="bg-[#f7f8fa] px-4 py-3 border-b border-[#e8ecf2]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0f1d33]">
                Mode Comparison
              </span>
            </div>
            <div className="divide-y divide-[#e8ecf2] text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 p-4 items-center gap-2">
                <span className="font-medium text-[#0f1d33]">User Verification</span>
                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded inline-block w-fit">
                  OTP Enabled: Firebase Phone SMS OTP (6 digits)
                </span>
                <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded inline-block w-fit">
                  OTP Disabled: None (Bypassed)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 p-4 items-center gap-2">
                <span className="font-medium text-[#0f1d33]">Visitor Download Experience</span>
                <span className="text-[#5a6a82]">Step 1: Enter Name & Phone → Step 2: Enter OTP → Download</span>
                <span className="text-[#5a6a82]">Direct Instant Download (No Name, Phone, or OTP Asked)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 p-4 items-center gap-2">
                <span className="font-medium text-[#0f1d33]">Lead Data Collection</span>
                <span className="text-[#5a6a82]">Saved in Supabase CRM + High Intent Verified</span>
                <span className="text-[#5a6a82]">Open Direct Download (Zero Friction)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary System Modules (Informational Cards) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#0f1d33]">
            Other CRM Modules & Integrations
          </h2>
          <p className="text-xs text-[#5a6a82]">
            Status of additional backend integrations configured for Bhuwanta CRM.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-xl border border-[#e8ecf2] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-[#0f1d33]">WhatsApp Lead Dispatch</h4>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>
            <p className="text-xs text-[#5a6a82] leading-relaxed">
              Auto-syncs incoming leads into WhatsApp Telecaller inbox with live quick-response buttons.
            </p>
          </div>

          <div className="rounded-xl border border-[#e8ecf2] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-[#0f1d33]">Email Autoresponder</h4>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200">
                Resend + Sanity
              </span>
            </div>
            <p className="text-xs text-[#5a6a82] leading-relaxed">
              Dispatches branded welcome emails with downloadable project brochures via Resend API.
            </p>
          </div>

          <div className="rounded-xl border border-[#e8ecf2] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-[#0f1d33]">Anti-Spam Rate Limiter</h4>
              <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 border border-purple-200">
                Upstash Sliding
              </span>
            </div>
            <p className="text-xs text-[#5a6a82] leading-relaxed">
              Restricts lead form submissions to 5 requests/hr per IP to eliminate bot scraping.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

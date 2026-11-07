'use client'

import React, { useState, useTransition } from 'react'
import {
  BellRing,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Send,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  X,
  Check,
  ShieldAlert,
  Server,
  Zap,
  Radio,
  FileSpreadsheet,
  BookOpen,
  Download,
  Info,
  Flame
} from 'lucide-react'
import { toast } from 'sonner'
import type { AlertRecipient } from '@/lib/monitoring/alerts'
import { generateMonitoringGuidePdf } from '@/lib/monitoring/guide-pdf'
import {
  addAlertRecipient,
  updateAlertRecipient,
  removeAlertRecipient,
  triggerTestSystemAlert
} from '../actions'

interface AlertsProps {
  initialAlertRecipients: AlertRecipient[]
}

const GUIDE_MARKDOWN_CONTENT = `# Bhuwanta CRM — System Monitoring & Failure Alerts Guide

## 1. Overview & Purpose
During production operations, external APIs (Meta WhatsApp Cloud API, Meta Ads Lead Gen, Supabase, Resend) can experience authentication revocation, rate limiting, or network disconnects.

A prime example occurred when Meta invalidated the WhatsApp Access Token with OAuthException Code 190 (Subcode 467 - User logged out). Because Node.js fetch() does not throw an exception on HTTP 401, standard crash-monitoring tools like Sentry did not trigger an alert, and the cron endpoint returned HTTP 200, meaning external cron schedulers (like cron-job.org) saw every run as "Green". As a result, automated WhatsApp leads reports stopped arriving for a week without anyone being alerted.

### The Solution: Domain-Level Health Observability
1. Zero Silent Failures: Any third-party authentication failure or sync error triggers an immediate structured alert.
2. Dedicated Inbox Routing: Alerts are sent exclusively to designated engineer/admin emails, completely decoupled from customer lead notifications.
3. Tabular Monitoring Digest: Information is presented in a clean, human-readable HTML table rather than raw developer stack traces.
4. Accurate HTTP Statuses: Failed cron deliveries return HTTP 502 Bad Gateway to turn external uptime monitors Red immediately.

## 2. Managing Alert Recipients (Add, Edit, Delete)
- How to Add: Click "+ Add Alert Email", enter recipient name & email address, select preferences (Instant Alerts, Tabular Digest), click Add Recipient.
- How to Edit: Click the pencil icon (Edit) on any row to change the Name, Email Address, or toggle notification preferences.
- How to Delete: Click the trash icon (Delete) to remove any recipient. Note: A minimum of 1 recipient is maintained so system alerts are never silenced (add a replacement before deleting the last recipient, or edit the existing email).

## 3. What Information Is Sent in Alerts?
Every alert is sent as a responsive HTML email featuring a structured 5-column operational table:
1. Timestamp (IST): Exact date and time in Indian Standard Time (+05:30).
2. Subsystem: The exact service being probed (Meta WhatsApp Cloud API, Meta Ads Sync, Supabase, Resend).
3. Severity Status: Color badge (HEALTHY, WARNING, CRITICAL).
4. Operational Details: Technical diagnostics, HTTP status codes, and Meta/database error trace IDs.
5. Action Required: Clear, step-by-step instructions on how to resolve the issue.

## 4. How Spam Protection & Redis Cooldown Works
If a cron job runs every 15 minutes and an API token is invalid, naive alert systems would send 96 duplicate emails every single day.
The monitoring engine acquires a temporary incident lock in Upstash Redis (crm:alert_cooldown:...) with a 2-hour Time-to-Live (TTL).
You receive an immediate alert on the first failure. Subsequent identical failures within the 2-hour window are suppressed. If the issue remains unresolved after 2 hours, a single reminder is dispatched. Manual "Test Alert" clicks always bypass this lock.

## 5. How to Test the System
Click "Test Alert" on any recipient row to immediately generate and deliver a sample tabular monitoring report to that inbox.
`

export default function Alerts({ initialAlertRecipients }: AlertsProps) {
  const [recipients, setRecipients] = useState<AlertRecipient[]>(initialAlertRecipients)
  const [isPending, startTransition] = useTransition()

  // Guide Modal & Tab State
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false)
  const [activeGuideTab, setActiveGuideTab] = useState<'purpose' | 'manage' | 'content' | 'spam'>('purpose')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Add Recipient Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newInstantAlerts, setNewInstantAlerts] = useState(true)
  const [newDailyDigest, setNewDailyDigest] = useState(true)
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editInstantAlerts, setEditInstantAlerts] = useState(true)
  const [editDailyDigest, setEditDailyDigest] = useState(true)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Test Alert State
  const [testingEmail, setTestingEmail] = useState<string | null>(null)

  // --- Handlers ---

  const handleDownloadGuide = async () => {
    try {
      setIsGeneratingPdf(true)
      await generateMonitoringGuidePdf({ download: true })
      toast.success('Downloaded Bhuwanta_System_Monitoring_Guide.pdf')
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      toast.error('Failed to generate PDF guide')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleOpenAddModal = () => {
    setNewName('')
    setNewEmail('')
    setNewInstantAlerts(true)
    setNewDailyDigest(true)
    setIsAddModalOpen(true)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsSubmittingAdd(true)
    try {
      const res = await addAlertRecipient({
        email: newEmail,
        name: newName,
        instant_alerts: newInstantAlerts,
        daily_digest: newDailyDigest
      })

      if (res.success && res.data) {
        setRecipients(prev => [res.data!, ...prev.filter(r => r.email !== res.data!.email)])
        toast.success(`Added ${newEmail} to alert recipients`)
        setIsAddModalOpen(false)
      } else {
        toast.error(res.error || 'Failed to add alert recipient')
      }
    } catch {
      toast.error('Unexpected error adding alert recipient')
    } finally {
      setIsSubmittingAdd(false)
    }
  }

  const handleStartEdit = (recipient: AlertRecipient) => {
    setEditingId(recipient.id)
    setEditName(recipient.name || '')
    setEditEmail(recipient.email || '')
    setEditInstantAlerts(recipient.instant_alerts !== false)
    setEditDailyDigest(recipient.daily_digest !== false)
  }

  const handleSaveEdit = async (id: string) => {
    const cleanEmail = editEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      toast.error('Please enter a valid email address')
      return
    }

    const duplicate = recipients.find(r => r.id !== id && r.email.toLowerCase() === cleanEmail)
    if (duplicate) {
      toast.error(`Email ${cleanEmail} is already assigned to ${duplicate.name || 'another recipient'}`)
      return
    }

    setIsSavingEdit(true)
    try {
      const res = await updateAlertRecipient(id, {
        name: editName,
        email: cleanEmail,
        instant_alerts: editInstantAlerts,
        daily_digest: editDailyDigest
      })

      if (res.success) {
        setRecipients(prev =>
          prev.map(r =>
            r.id === id
              ? {
                  ...r,
                  name: editName.trim() || cleanEmail.split('@')[0],
                  email: cleanEmail,
                  instant_alerts: editInstantAlerts,
                  daily_digest: editDailyDigest
                }
              : r
          )
        )
        toast.success(`Updated alert recipient: ${cleanEmail}`)
        setEditingId(null)
      } else {
        toast.error(res.error || 'Failed to update alert recipient')
      }
    } catch {
      toast.error('Failed to update alert recipient')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (recipients.length <= 1) {
      toast.error('At least one alert recipient is required so system failures are never silenced. Please add a replacement email first, or edit this email.')
      return
    }

    if (!confirm(`Are you sure you want to remove ${email} from receiving system monitoring alerts?`)) {
      return
    }

    setDeletingId(id)
    startTransition(async () => {
      try {
        const res = await removeAlertRecipient(id)
        if (res.success) {
          setRecipients(prev => prev.filter(r => r.id !== id))
          toast.success(`Removed ${email} from alerts list`)
        } else {
          toast.error(res.error || 'Failed to remove recipient')
        }
      } catch {
        toast.error('Unexpected error removing recipient')
      } finally {
        setDeletingId(null)
      }
    })
  }

  const handleTriggerTest = async (email: string) => {
    setTestingEmail(email)
    try {
      const res = await triggerTestSystemAlert(email)
      if (res.success) {
        toast.success(res.message || 'Test monitoring table sent! Check your inbox.')
      } else {
        toast.error(res.error || 'Failed to dispatch test monitoring alert')
      }
    } catch {
      toast.error('Failed to dispatch test alert email')
    } finally {
      setTestingEmail(null)
    }
  }

  return (
    <div className="rounded-xl border border-[#e8ecf2] bg-white shadow-sm overflow-hidden mb-8">
      {/* Module Header */}
      <div className="border-b border-[#e8ecf2] px-5 sm:px-6 py-5 bg-gradient-to-r from-white via-[#fbfcfd] to-[#f8fafc]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#002935] flex items-center justify-center shrink-0 shadow-xs border border-[#0f3d4d]">
              <BellRing className="w-5 h-5 text-[#c4a55a]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-[#0f1d33] tracking-tight">
                  System Monitoring & Failure Alerts
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                  Live Observability
                </span>
              </div>
              <p className="text-xs text-[#5a6a82] mt-1">
                Real-time health monitoring and automated tabular failure logs for production crons, Meta WhatsApp API, Supabase, and Resend.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Feature Guide Popup Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsGuideModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-white text-[#0f1d33] border border-[#cbd5e1] hover:bg-[#f8fafc] transition-all cursor-pointer shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#002935]" />
              <span>Feature Guide</span>
            </button>

            {/* Direct PDF Download Button */}
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadGuide}
              title="Download official PDF guide"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-white text-[#0f1d33] border border-[#cbd5e1] hover:bg-[#f8fafc] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#002935]" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#002935]" />
              )}
              <span className="hidden sm:inline">Download</span> PDF Guide
            </button>

            {/* Add Alert Email Button */}
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#002935] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#003847] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#c4a55a]" />
              Add Alert Email
            </button>
          </div>
        </div>
      </div>

      {/* Subsystem Health Dashboard Bar (No Collisions, Generous Spacing) */}
      <div className="border-b border-[#e8ecf2] bg-[#f8fafc] px-5 sm:px-6 py-4">
        <span className="text-xs font-bold text-[#0f1d33] uppercase tracking-wider mb-3 block flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#c4a55a]" />
          Monitored Subsystems & Live Health Probes
        </span>

        {/* Responsive Grid: 1 col on mobile, 2 on tablets/small laptops, 4 on large screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* Card 1: Meta WhatsApp */}
          <div className="bg-white p-3.5 rounded-xl border border-red-200 shadow-2xs flex flex-col justify-between hover:border-red-300 transition-colors">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                    <Zap className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-[#0f1d33] truncate">
                    WhatsApp Cloud API
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200 whitespace-nowrap">
                  <AlertTriangle className="w-2.5 h-2.5 text-red-600 shrink-0" />
                  Action Required
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] leading-snug">
                Token session revoked (Subcode 467).
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-red-100/60 flex items-center justify-between text-[10px]">
              <span className="text-[#64748b]">Status Code:</span>
              <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-100">
                HTTP 401
              </span>
            </div>
          </div>

          {/* Card 2: Meta Ads Leads Sync */}
          <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                    <Server className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-xs font-bold text-[#0f1d33] truncate">
                    Meta Ads Leads Sync
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 whitespace-nowrap">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                  Operational
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] leading-snug">
                Cron path /api/cron/meta-sync
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-[10px]">
              <span className="text-[#64748b]">Sync Cycle:</span>
              <span className="font-mono text-[#0f1d33] font-medium">Every 15 mins</span>
            </div>
          </div>

          {/* Card 3: Resend Email Engine */}
          <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                    <Send className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-xs font-bold text-[#0f1d33] truncate">
                    Resend Mail Engine
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 whitespace-nowrap">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                  Operational
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] leading-snug">
                Delivering PDF/Excel reports & alerts.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-[10px]">
              <span className="text-[#64748b]">Sender Domain:</span>
              <span className="font-mono text-[#0f1d33] font-medium">bhuwanta.com</span>
            </div>
          </div>

          {/* Card 4: Supabase & Redis */}
          <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 border border-teal-100">
                    <ShieldAlert className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-xs font-bold text-[#0f1d33] truncate">
                    Supabase & Redis
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 whitespace-nowrap">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                  Connected
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] leading-snug">
                PostgreSQL pool & in-memory caches.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-[10px]">
              <span className="text-[#64748b]">Avg Latency:</span>
              <span className="font-mono text-[#0f1d33] font-medium">~14ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Recipients Table with Proper Column Widths & Overflow Wrap */}
      <div className="px-5 sm:px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3.5">
          <span className="text-xs font-bold text-[#0f1d33] uppercase tracking-wider">
            Designated Alert Recipients ({recipients.length})
          </span>
          <span className="text-xs text-[#5a6a82]">
            Only these emails receive system health warnings and tabular logs
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#e8ecf2] shadow-2xs">
          <table className="w-full text-left text-xs text-[#0f1d33] min-w-[680px]">
            <thead className="bg-[#f8fafc] text-[#5a6a82] border-b border-[#e8ecf2] font-semibold">
              <tr>
                <th className="px-4 py-3.5 w-1/3 min-w-[220px]">Recipient Email</th>
                <th className="px-4 py-3.5 min-w-[180px]">Instant Alerts (Meta 401, DB Crashes)</th>
                <th className="px-4 py-3.5 min-w-[160px]">Tabular Cron Digest</th>
                <th className="px-4 py-3.5 min-w-[140px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ecf2] bg-white">
              {recipients.map(recipient => {
                const isEditing = editingId === recipient.id
                const isDeleting = deletingId === recipient.id
                const isTesting = testingEmail === recipient.email

                return (
                  <tr key={recipient.id} className="hover:bg-[#fbfcfd] transition-colors">
                    {/* Recipient info */}
                    <td className="px-4 py-3.5 align-middle">
                      {isEditing ? (
                        <div className="space-y-2 max-w-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-[#5a6a82] uppercase mb-0.5">
                              Recipient Name
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="w-full text-xs rounded-md border border-[#cbd5e1] px-2.5 py-1.5 outline-none focus:border-[#002935] focus:ring-1 focus:ring-[#002935] bg-white text-[#0f1d33]"
                              placeholder="Recipient Name"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#5a6a82] uppercase mb-0.5">
                              Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={e => setEditEmail(e.target.value)}
                              className="w-full text-xs font-mono rounded-md border border-[#cbd5e1] px-2.5 py-1.5 outline-none focus:border-[#002935] focus:ring-1 focus:ring-[#002935] bg-white text-[#0f1d33]"
                              placeholder="name@example.com"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-[#0f1d33] flex items-center gap-1.5">
                            {recipient.name || 'Admin'}
                            {recipient.id === 'master-alert-default' && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                Master Default
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#5a6a82] font-mono mt-0.5">
                            {recipient.email}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Instant Alerts toggle */}
                    <td className="px-4 py-3.5 align-middle">
                      {isEditing ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editInstantAlerts}
                            onChange={e => setEditInstantAlerts(e.target.checked)}
                            className="rounded border-[#cbd5e1] text-[#002935] focus:ring-0 cursor-pointer"
                          />
                          <span className="text-xs text-[#0f1d33] font-medium">Receive instant failure alerts</span>
                        </label>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            recipient.instant_alerts !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          {recipient.instant_alerts !== false ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Enabled (Immediate)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>Disabled</span>
                            </>
                          )}
                        </span>
                      )}
                    </td>

                    {/* Tabular Daily Digest toggle */}
                    <td className="px-4 py-3.5 align-middle">
                      {isEditing ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editDailyDigest}
                            onChange={e => setEditDailyDigest(e.target.checked)}
                            className="rounded border-[#cbd5e1] text-[#002935] focus:ring-0 cursor-pointer"
                          />
                          <span className="text-xs text-[#0f1d33] font-medium">Include in tabular cron digests</span>
                        </label>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            recipient.daily_digest !== false
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{recipient.daily_digest !== false ? 'Tabular Digest Active' : 'Digest Off'}</span>
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap align-middle">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isSavingEdit}
                            onClick={() => handleSaveEdit(recipient.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-[#002935] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003847] cursor-pointer shadow-xs"
                          >
                            {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-[#c4a55a]" />}
                            Save
                          </button>
                          <button
                            type="button"
                            disabled={isSavingEdit}
                            onClick={() => setEditingId(null)}
                            className="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Test Email Button */}
                          <button
                            type="button"
                            disabled={isTesting}
                            onClick={() => handleTriggerTest(recipient.email)}
                            title="Dispatch sample tabular monitoring email to this inbox"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-200/80 transition-colors cursor-pointer shadow-2xs"
                          >
                            {isTesting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                            ) : (
                              <Send className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            Test Alert
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(recipient)}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-[#0f1d33] hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Edit Alert Preferences"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button (Always rendered so user can remove emails; guarded if only 1 remaining) */}
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDelete(recipient.id, recipient.email)}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title={
                              recipients.length <= 1
                                ? 'Cannot remove the last recipient (add replacement first or edit this email)'
                                : `Remove ${recipient.email}`
                            }
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Guide POPUP MODAL (Does NOT push layout down) */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-[#e8ecf2] overflow-hidden">
            {/* Modal Sticky Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-[#002935] to-[#013847] border-b border-[#0f3d4d] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <BookOpen className="w-4 h-4 text-[#c4a55a]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    System Monitoring & Alerts — User Guide
                  </h3>
                  <p className="text-[11px] text-[#94a3b8]">
                    Architecture, operational policies, and recipient management
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Download PDF Button in Modal Header */}
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={handleDownloadGuide}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#c4a55a] hover:bg-[#d4b56a] px-3 py-1.5 text-xs font-bold text-[#002935] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#002935]" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download PDF</span>
                </button>

                {/* Close X Button */}
                <button
                  type="button"
                  onClick={() => setIsGuideModalOpen(false)}
                  className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 pt-3 pb-2.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveGuideTab('purpose')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeGuideTab === 'purpose'
                    ? 'bg-[#002935] text-white shadow-xs'
                    : 'bg-white text-[#5a6a82] hover:text-[#0f1d33] border border-[#e2e8f0]'
                }`}
              >
                1. Purpose & Outage Solved
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('manage')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeGuideTab === 'manage'
                    ? 'bg-[#002935] text-white shadow-xs'
                    : 'bg-white text-[#5a6a82] hover:text-[#0f1d33] border border-[#e2e8f0]'
                }`}
              >
                2. How to Add, Edit & Delete
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('content')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeGuideTab === 'content'
                    ? 'bg-[#002935] text-white shadow-xs'
                    : 'bg-white text-[#5a6a82] hover:text-[#0f1d33] border border-[#e2e8f0]'
                }`}
              >
                3. Information Sent in Alerts
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('spam')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeGuideTab === 'spam'
                    ? 'bg-[#002935] text-white shadow-xs'
                    : 'bg-white text-[#5a6a82] hover:text-[#0f1d33] border border-[#e2e8f0]'
                }`}
              >
                4. Spam Protection & Redis
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#334155] leading-relaxed">
              {/* Tab 1: Purpose */}
              {activeGuideTab === 'purpose' && (
                <div className="space-y-3.5">
                  <div className="p-4 bg-red-50/60 rounded-xl border border-red-200">
                    <h4 className="font-bold text-red-900 text-sm mb-1.5 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      The 1-Week Outage Problem Solved
                    </h4>
                    <p className="text-red-800 leading-relaxed">
                      Recently, the automated scheduled WhatsApp leads report failed for an entire week without raising any alarm. The root cause was that Meta invalidated the WhatsApp Access Token with <code className="bg-white/80 text-red-700 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">OAuthException: Code 190 (Subcode 467 - User logged out)</code>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-[#0f1d33] text-xs uppercase tracking-wider">
                      Why Sentry & cron-job.org Didn&apos;t Alert You:
                    </h5>
                    <ul className="list-disc pl-5 space-y-1.5 text-[#475569]">
                      <li>
                        <strong>Sentry only tracks unhandled code crashes:</strong> When Node.js calls <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">fetch()</code> to Meta API, an HTTP 401 response is handled as a standard response object without crashing the server. Sentry assumed the function executed normally.
                      </li>
                      <li>
                        <strong>Cron returned HTTP 200:</strong> The endpoint logged a warning and finished with HTTP 200 OK. As a result, <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">cron-job.org</code> registered every scheduled run as &quot;Success / Green&quot;.
                      </li>
                    </ul>
                  </div>

                  <div className="p-3.5 bg-[#fcfaf5] rounded-xl border border-[#c4a55a]/40 text-[#785b12]">
                    <span className="font-bold block mb-1">The Architecture Fix:</span>
                    This monitoring module now actively intercepts external API HTTP 4xx/5xx responses. It returns <strong>HTTP 502 Bad Gateway</strong> to turn external schedulers Red, and immediately dispatches a styled tabular diagnostic report to your designated alert inbox.
                  </div>
                </div>
              )}

              {/* Tab 2: Manage */}
              {activeGuideTab === 'manage' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                      <div className="font-bold text-[#0f1d33] mb-1.5 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-emerald-600" />
                        1. Adding Recipient
                      </div>
                      <p className="text-[#64748b]">
                        Click <strong>&quot;Add Alert Email&quot;</strong> in the top header. Enter the name and email. Choose whether to receive Instant Critical Alerts, Tabular Cron Digests, or both.
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                      <div className="font-bold text-[#0f1d33] mb-1.5 flex items-center gap-1.5">
                        <Edit2 className="w-4 h-4 text-blue-600" />
                        2. Editing Recipient
                      </div>
                      <p className="text-[#64748b]">
                        Click the pencil icon <Edit2 className="w-3 h-3 inline text-gray-500" /> on any row to change the <strong>Name</strong>, <strong>Email Address</strong>, or notification preferences at any time.
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                      <div className="font-bold text-[#0f1d33] mb-1.5 flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4 text-red-600" />
                        3. Removing Recipient
                      </div>
                      <p className="text-[#64748b]">
                        Click the trash icon <Trash2 className="w-3 h-3 inline text-red-500" /> to remove an email. A minimum of 1 recipient is maintained to prevent silent failures (add a replacement before removing the last one, or edit the existing email).
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-900 block">Instant Verification:</span>
                      <span className="text-amber-800 text-[11px]">
                        Click the <strong>&quot;Test Alert&quot;</strong> button in any row to send a sample tabular monitoring email to that exact inbox.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Content */}
              {activeGuideTab === 'content' && (
                <div className="space-y-3">
                  <p className="font-semibold text-[#0f1d33]">
                    What information is sent in the monitoring emails?
                  </p>
                  <p className="text-[#64748b]">
                    Alerts are sent as clean, responsive HTML emails formatted as a structured 5-column operational table:
                  </p>

                  <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#475569] font-bold">
                        <tr>
                          <th className="px-3.5 py-2.5">Column Name</th>
                          <th className="px-3.5 py-2.5">What It Contains</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]">
                        <tr>
                          <td className="px-3.5 py-2 font-mono font-bold text-[#0f1d33]">Timestamp (IST)</td>
                          <td className="px-3.5 py-2 text-[#64748b]">Exact execution timestamp in Indian Standard Time (+05:30).</td>
                        </tr>
                        <tr>
                          <td className="px-3.5 py-2 font-mono font-bold text-[#0f1d33]">Subsystem</td>
                          <td className="px-3.5 py-2 text-[#64748b]">The probed service: Meta WhatsApp Cloud API, Meta Ads Sync, Supabase, Resend.</td>
                        </tr>
                        <tr>
                          <td className="px-3.5 py-2 font-mono font-bold text-[#0f1d33]">Status Badge</td>
                          <td className="px-3.5 py-2 text-[#64748b]">Color-coded severity: HEALTHY (Green), WARNING (Yellow), CRITICAL (Red).</td>
                        </tr>
                        <tr>
                          <td className="px-3.5 py-2 font-mono font-bold text-[#0f1d33]">Operational Details</td>
                          <td className="px-3.5 py-2 text-[#64748b]">HTTP status codes, technical diagnostics, and Meta trace IDs.</td>
                        </tr>
                        <tr>
                          <td className="px-3.5 py-2 font-mono font-bold text-[#0f1d33]">Action Required</td>
                          <td className="px-3.5 py-2 text-[#64748b]">Clear instructions on how to resolve the degradation (e.g. update token in Vercel).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 4: Spam Protection */}
              {activeGuideTab === 'spam' && (
                <div className="space-y-3.5">
                  <div className="p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] space-y-2">
                    <h4 className="font-bold text-[#0f1d33] text-sm flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-600" />
                      Upstash Redis Cooldown Throttling
                    </h4>
                    <p className="text-[#64748b] leading-relaxed">
                      If a cron job runs every 15 minutes and an external API key is invalid, naive alert systems would send <strong>96 emails every day</strong>, cluttering inboxes and causing alert fatigue.
                    </p>
                    <div className="pt-2 border-t border-[#e2e8f0] space-y-1 text-[#475569]">
                      <p>
                        • <strong>Immediate Alert:</strong> The monitoring engine acquires a temporary incident lock in Upstash Redis (<code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border">crm:alert_cooldown:...</code>) with a <strong>2-hour Time-to-Live (TTL)</strong>.
                      </p>
                      <p>
                        • <strong>Suppression Window:</strong> You are alerted immediately on the first failure. Subsequent identical failures are suppressed for 2 hours.
                      </p>
                      <p>
                        • <strong>Reminder:</strong> If the issue is still active after 2 hours, a single reminder is dispatched.
                      </p>
                      <p>
                        • <strong>Manual Override:</strong> The &quot;Test Alert&quot; button always bypasses cooldown locks.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-[#94a3b8]">
                Official PDF Document • Exported as <code className="font-mono text-[#002935] font-semibold">Bhuwanta_System_Monitoring_Guide.pdf</code>
              </span>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="rounded-lg bg-[#002935] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#003847] transition-all cursor-pointer shadow-xs"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Alert Email Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#e8ecf2]">
            <div className="flex items-center justify-between border-b border-[#e8ecf2] pb-3.5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#002935] flex items-center justify-center shrink-0">
                  <BellRing className="w-4 h-4 text-[#c4a55a]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0f1d33]">Add Monitoring Alert Email</h3>
                  <p className="text-xs text-[#5a6a82]">Receive tabular system logs and instant failure alerts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0f1d33] mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. S Santosh / Lead Engineer"
                  className="w-full text-xs rounded-lg border border-[#cbd5e1] px-3 py-2 outline-none focus:border-[#002935] focus:ring-1 focus:ring-[#002935]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f1d33] mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="e.g. santosh@gmail.com"
                  className="w-full text-xs rounded-lg border border-[#cbd5e1] px-3 py-2 outline-none focus:border-[#002935] focus:ring-1 focus:ring-[#002935]"
                />
                <span className="text-[11px] text-[#64748b] mt-1 block">
                  Only alerts will be sent here (separated from customer lead notifications).
                </span>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-[#f1f5f9]">
                <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-[#f8fafc] transition-colors border border-transparent hover:border-[#e2e8f0]">
                  <input
                    type="checkbox"
                    checked={newInstantAlerts}
                    onChange={e => setNewInstantAlerts(e.target.checked)}
                    className="mt-0.5 rounded border-[#cbd5e1] text-[#002935] focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#0f1d33] block">
                      Instant Critical Alerts (Recommended)
                    </span>
                    <span className="text-[11px] text-[#64748b] block mt-0.5">
                      Dispatched immediately when Meta WhatsApp token expires or DB drops.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-[#f8fafc] transition-colors border border-transparent hover:border-[#e2e8f0]">
                  <input
                    type="checkbox"
                    checked={newDailyDigest}
                    onChange={e => setNewDailyDigest(e.target.checked)}
                    className="mt-0.5 rounded border-[#cbd5e1] text-[#002935] focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#0f1d33] block">
                      Tabular Cron Monitoring Digest
                    </span>
                    <span className="text-[11px] text-[#64748b] block mt-0.5">
                      Structured HTML table summarizing each cron execution and output.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e8ecf2]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-[#cbd5e1] px-3.5 py-1.5 text-xs font-semibold text-[#5a6a82] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#002935] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#003847] disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmittingAdd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-[#c4a55a]" />}
                  Add Recipient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

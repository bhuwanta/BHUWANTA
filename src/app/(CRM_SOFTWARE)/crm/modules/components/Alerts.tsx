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
  FileSpreadsheet
} from 'lucide-react'
import { toast } from 'sonner'
import type { AlertRecipient } from '@/lib/monitoring/alerts'
import {
  addAlertRecipient,
  updateAlertRecipient,
  removeAlertRecipient,
  triggerTestSystemAlert
} from '../actions'

interface AlertsProps {
  initialAlertRecipients: AlertRecipient[]
}

export default function Alerts({ initialAlertRecipients }: AlertsProps) {
  const [recipients, setRecipients] = useState<AlertRecipient[]>(initialAlertRecipients)
  const [isPending, startTransition] = useTransition()

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newInstantAlerts, setNewInstantAlerts] = useState(true)
  const [newDailyDigest, setNewDailyDigest] = useState(true)
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editInstantAlerts, setEditInstantAlerts] = useState(true)
  const [editDailyDigest, setEditDailyDigest] = useState(true)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Test Alert State
  const [testingEmail, setTestingEmail] = useState<string | null>(null)

  // --- Handlers ---

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
    setEditInstantAlerts(recipient.instant_alerts !== false)
    setEditDailyDigest(recipient.daily_digest !== false)
  }

  const handleSaveEdit = async (id: string) => {
    setIsSavingEdit(true)
    try {
      const res = await updateAlertRecipient(id, {
        name: editName,
        instant_alerts: editInstantAlerts,
        daily_digest: editDailyDigest
      })

      if (res.success) {
        setRecipients(prev =>
          prev.map(r => (r.id === id ? { ...r, name: editName, instant_alerts: editInstantAlerts, daily_digest: editDailyDigest } : r))
        )
        toast.success('Alert preferences updated successfully')
        setEditingId(null)
      } else {
        toast.error(res.error || 'Failed to update preferences')
      }
    } catch {
      toast.error('Failed to update alert preferences')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async (id: string, email: string) => {
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
      <div className="border-b border-[#e8ecf2] px-6 py-5 bg-gradient-to-r from-white to-[#f8fafc]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#002935] flex items-center justify-center shrink-0 shadow-sm">
              <BellRing className="w-5 h-5 text-[#c4a55a]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#0f1d33]">
                  System Monitoring & Failure Alerts
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                  <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                  Live Observability
                </span>
              </div>
              <p className="text-xs text-[#5a6a82] mt-0.5">
                Automatically dispatches tabular system health logs and instant failure alerts when external services degrade.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#002935] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#003847] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#c4a55a]" />
              Add Alert Email
            </button>
          </div>
        </div>
      </div>

      {/* Subsystem Health Dashboard Bar */}
      <div className="border-b border-[#e8ecf2] bg-[#f8fafc] px-6 py-4">
        <span className="text-xs font-bold text-[#0f1d33] uppercase tracking-wider mb-2.5 block flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#c4a55a]" />
          Monitored Subsystems & Health Probes
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Subsystem 1: Meta WhatsApp */}
          <div className="bg-white p-3 rounded-lg border border-[#e2e8f0] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0f1d33] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                WhatsApp Cloud API
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                Meta 401 (Action Req.)
              </span>
            </div>
            <p className="text-[11px] text-[#64748b] mt-1 line-clamp-1">
              Token session expired (Subcode 467)
            </p>
          </div>

          {/* Subsystem 2: Meta Ads Sync */}
          <div className="bg-white p-3 rounded-lg border border-[#e2e8f0] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0f1d33] flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-600" />
                Meta Ads Leads Sync
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                Operational
              </span>
            </div>
            <p className="text-[11px] text-[#64748b] mt-1 line-clamp-1">
              Cron path /api/cron/meta-sync
            </p>
          </div>

          {/* Subsystem 3: Resend Email Engine */}
          <div className="bg-white p-3 rounded-lg border border-[#e2e8f0] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0f1d33] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-amber-600" />
                Resend Mail Engine
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                Verified
              </span>
            </div>
            <p className="text-[11px] text-[#64748b] mt-1 line-clamp-1">
              Delivering PDF/Excel report emails
            </p>
          </div>

          {/* Subsystem 4: Database & Redis */}
          <div className="bg-white p-3 rounded-lg border border-[#e2e8f0] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0f1d33] flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-teal-600" />
                Supabase & Redis
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                Connected
              </span>
            </div>
            <p className="text-[11px] text-[#64748b] mt-1 line-clamp-1">
              PostgreSQL pool & session caches
            </p>
          </div>
        </div>
      </div>

      {/* Alert Recipients Table */}
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#0f1d33] uppercase tracking-wider">
            Alert Recipient Inboxes ({recipients.length})
          </span>
          <span className="text-xs text-[#5a6a82]">
            Only these emails receive system health warnings and tabular logs
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#e8ecf2]">
          <table className="w-full text-left text-xs text-[#0f1d33]">
            <thead className="bg-[#f8fafc] text-[#5a6a82] border-b border-[#e8ecf2] font-semibold">
              <tr>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Instant Alerts (Meta 401, DB Crashes)</th>
                <th className="px-4 py-3">Tabular Cron Digest</th>
                <th className="px-4 py-3 text-right">Actions</th>
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
                    <td className="px-4 py-3.5">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full text-xs rounded border border-[#cbd5e1] px-2 py-1 outline-none focus:border-[#002935]"
                            placeholder="Name"
                          />
                          <span className="text-[11px] text-[#64748b] font-mono block">
                            {recipient.email}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-[#0f1d33]">
                            {recipient.name || 'Admin'}
                            {recipient.id === 'master-alert-default' && (
                              <span className="ml-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Master Default
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#5a6a82] font-mono">
                            {recipient.email}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Instant Alerts toggle */}
                    <td className="px-4 py-3.5">
                      {isEditing ? (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editInstantAlerts}
                            onChange={e => setEditInstantAlerts(e.target.checked)}
                            className="rounded border-[#cbd5e1] text-[#002935] focus:ring-0 cursor-pointer"
                          />
                          <span className="text-xs text-[#0f1d33]">Receive instant failure alerts</span>
                        </label>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            recipient.instant_alerts !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          {recipient.instant_alerts !== false ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Enabled (Immediate)
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-gray-400" /> Disabled
                            </>
                          )}
                        </span>
                      )}
                    </td>

                    {/* Tabular Daily Digest toggle */}
                    <td className="px-4 py-3.5">
                      {isEditing ? (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editDailyDigest}
                            onChange={e => setEditDailyDigest(e.target.checked)}
                            className="rounded border-[#cbd5e1] text-[#002935] focus:ring-0 cursor-pointer"
                          />
                          <span className="text-xs text-[#0f1d33]">Include in tabular cron digests</span>
                        </label>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            recipient.daily_digest !== false
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          <FileSpreadsheet className="w-3 h-3 text-blue-600" />
                          {recipient.daily_digest !== false ? 'Tabular Digest Active' : 'Digest Off'}
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isSavingEdit}
                            onClick={() => handleSaveEdit(recipient.id)}
                            className="inline-flex items-center gap-1 rounded bg-[#002935] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#003847] cursor-pointer"
                          >
                            {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-[#c4a55a]" />}
                            Save
                          </button>
                          <button
                            type="button"
                            disabled={isSavingEdit}
                            onClick={() => setEditingId(null)}
                            className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 cursor-pointer"
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
                            title="Send sample tabular monitoring report to this email"
                            className="inline-flex items-center gap-1 rounded bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            {isTesting ? (
                              <Loader2 className="w-3 h-3 animate-spin text-amber-700" />
                            ) : (
                              <Send className="w-3 h-3 text-amber-600" />
                            )}
                            Test Alert
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(recipient)}
                            className="rounded p-1 text-gray-400 hover:text-[#0f1d33] hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Edit Alert Settings"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          {recipient.id !== 'master-alert-default' && (
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDelete(recipient.id, recipient.email)}
                              className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove Recipient"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
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

      {/* Add Alert Email Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-[#e8ecf2]">
            <div className="flex items-center justify-between border-b border-[#e8ecf2] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-[#002935] flex items-center justify-center">
                  <BellRing className="w-4 h-4 text-[#c4a55a]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#0f1d33]">Add Monitoring Alert Email</h3>
                  <p className="text-xs text-[#5a6a82]">Receive tabular system logs and instant failure alerts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f1d33] mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Lead Engineer / S Santosh"
                  className="w-full text-xs rounded-lg border border-[#cbd5e1] px-3 py-2 outline-none focus:border-[#002935] focus:ring-1 focus:ring-[#002935]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f1d33] mb-1">
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
              </div>

              <div className="space-y-2 pt-2 border-t border-[#f1f5f9]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newInstantAlerts}
                    onChange={e => setNewInstantAlerts(e.target.checked)}
                    className="rounded border-[#cbd5e1] text-[#002935] focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-medium text-[#0f1d33] block">
                      Instant Critical Alerts (Recommended)
                    </span>
                    <span className="text-[11px] text-[#64748b] block">
                      Dispatched immediately when Meta WhatsApp token expires or DB drops
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDailyDigest}
                    onChange={e => setNewDailyDigest(e.target.checked)}
                    className="rounded border-[#cbd5e1] text-[#002935] focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-medium text-[#0f1d33] block">
                      Tabular Cron Monitoring Digest
                    </span>
                    <span className="text-[11px] text-[#64748b] block">
                      Structured HTML table summarizing each cron execution and output
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#002935] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#003847] disabled:opacity-50 cursor-pointer"
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


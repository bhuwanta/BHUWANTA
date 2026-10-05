'use client'

import { useState, useTransition } from 'react'
import {
  Blocks,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Plus,
  Trash2,
  Send,
  Clock,
  ShieldCheck,
  Smartphone,
  MessageCircle,
  X,
  Users,
  User,
  Edit2,
  Check,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  toggleOtpModuleStatus, 
  removeReportRecipient, 
  testReportEmail, 
  sendEmailOtp,
  verifyAndAddEmail,
  ReportRecipient,
  WaRecipient,
  addWaRecipient,
  updateWaRecipient,
  testReportWa,
  removeWaRecipient
} from './actions'

interface ModulesClientProps {
  initialOtpEnabled: boolean
  initialRecipients: ReportRecipient[]
  initialWaRecipients: WaRecipient[]
}

export default function ModulesClient({ initialOtpEnabled, initialRecipients, initialWaRecipients }: ModulesClientProps) {
  const [otpEnabled, setOtpEnabled] = useState(initialOtpEnabled)
  const [isPending, startTransition] = useTransition()
  
  const [recipients, setRecipients] = useState<ReportRecipient[]>(initialRecipients)
  const [waRecipients, setWaRecipients] = useState<WaRecipient[]>(initialWaRecipients)
  
  // Modal State
  const [activeModal, setActiveModal] = useState<'email' | 'wa' | null>(null)

  // Add Email Flow States
  const [newEmail, setNewEmail] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [showOtpField, setShowOtpField] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null)

  // Inline Test Trigger States (no popup inside popup)
  const [testingRowId, setTestingRowId] = useState<string | null>(null)
  const [selectedTestHour, setSelectedTestHour] = useState<string>('current')
  const [isExecutingTest, setIsExecutingTest] = useState(false)

  // WhatsApp Flow States
  const [newWaName, setNewWaName] = useState('')
  const [newWaNumber, setNewWaNumber] = useState('')
  const [isAddingWa, setIsAddingWa] = useState(false)
  const [deletingWaId, setDeletingWaId] = useState<string | null>(null)
  const [editingWaId, setEditingWaId] = useState<string | null>(null)
  const [editWaName, setEditWaName] = useState('')
  const [editWaPhone, setEditWaPhone] = useState('')
  const [isSavingWaEdit, setIsSavingWaEdit] = useState(false)

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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || !newEmail.includes('@')) return
    
    setIsSendingOtp(true)
    const res = await sendEmailOtp(newEmail.toLowerCase().trim())
    if (res.success) {
      toast.success('Verification code sent!', { description: `Check your inbox at ${newEmail}` })
      setShowOtpField(true)
    } else {
      toast.error('Failed to send code', { description: res.error })
    }
    setIsSendingOtp(false)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    setIsVerifying(true)
    const res = await verifyAndAddEmail(newEmail.toLowerCase().trim(), otpCode.trim())
    if (res.success) {
      toast.success('Email verified and added!')
      
      // Optimistic update
      setRecipients([
        ...recipients, 
        { id: Date.now().toString(), email: newEmail.toLowerCase().trim(), created_at: new Date().toISOString() }
      ])
      
      // Reset form
      setNewEmail('')
      setOtpCode('')
      setShowOtpField(false)
    } else {
      toast.error('Verification failed', { description: res.error })
    }
    setIsVerifying(false)
  }

  const handleDeleteEmail = async (id: string, email: string) => {
    if (!window.confirm(`Are you sure you want to remove ${email} from the report recipients list?`)) return
    
    setDeletingEmailId(id)
    const res = await removeReportRecipient(id)
    if (res.success) {
      toast.success('Email removed')
      setRecipients(recipients.filter(r => r.id !== id))
    } else {
      toast.error('Failed to remove email', { description: res.error })
    }
    setDeletingEmailId(null)
  }

  // --- WhatsApp Handlers ---
  const handleAddWa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWaNumber || newWaNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number')
      return
    }
    
    setIsAddingWa(true)
    const fullNumber = `91${newWaNumber.trim()}`
    const trimmedName = newWaName.trim() || null
    const res = await addWaRecipient(fullNumber, trimmedName)
    if (res.success) {
      toast.success('WhatsApp recipient added!')
      setWaRecipients([
        ...waRecipients, 
        { id: Date.now().toString(), phone_number: fullNumber, name: trimmedName, created_at: new Date().toISOString() }
      ])
      setNewWaNumber('')
      setNewWaName('')
    } else {
      toast.error('Failed to add number', { description: res.error })
    }
    setIsAddingWa(false)
  }

  const handleStartEditWa = (r: WaRecipient) => {
    if (testingRowId === r.id) setTestingRowId(null)
    setEditingWaId(r.id)
    setEditWaName(r.name || '')
    const cleanPhone = r.phone_number.startsWith('91') ? r.phone_number.slice(2) : r.phone_number
    setEditWaPhone(cleanPhone)
  }

  const handleSaveWaEdit = async (id: string) => {
    if (!editWaPhone || editWaPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number')
      return
    }
    setIsSavingWaEdit(true)
    const fullNumber = `91${editWaPhone.trim()}`
    const trimmedName = editWaName.trim() || null

    const res = await updateWaRecipient(id, {
      name: trimmedName,
      phone_number: fullNumber
    })

    if (res.success) {
      toast.success('Recipient updated successfully!')
      setWaRecipients(waRecipients.map(r => r.id === id ? {
        ...r,
        name: trimmedName,
        phone_number: fullNumber
      } : r))
      setEditingWaId(null)
    } else {
      toast.error('Failed to update recipient', { description: res.error })
    }
    setIsSavingWaEdit(false)
  }

  const handleDeleteWa = async (id: string, phone: string) => {
    if (!window.confirm(`Are you sure you want to remove ${phone} from the WhatsApp report recipients?`)) return
    
    setDeletingWaId(id)
    const res = await removeWaRecipient(id)
    if (res.success) {
      toast.success('Number removed')
      setWaRecipients(waRecipients.filter(r => r.id !== id))
    } else {
      toast.error('Failed to remove number', { description: res.error })
    }
    setDeletingWaId(null)
  }

  // --- Inline Test Handlers ---
  const handleToggleInlineTest = (id: string) => {
    if (testingRowId === id) {
      setTestingRowId(null)
    } else {
      setTestingRowId(id)
      setSelectedTestHour('current')
    }
  }

  const handleExecuteInlineTest = async (type: 'email' | 'wa', target: string) => {
    setIsExecutingTest(true)
    const hourNum = selectedTestHour === 'current' ? undefined : parseInt(selectedTestHour, 10)

    try {
      if (type === 'email') {
        const res = await testReportEmail(target, hourNum)
        if (res.success) {
          toast.success(`Test report email sent to ${target}`)
          setTestingRowId(null)
        } else {
          toast.error('Failed to send test email', { description: res.error })
        }
      } else {
        const res = await testReportWa(target, hourNum)
        if (res.success) {
          toast.success(`Test report WhatsApp sent to +${target}`)
          setTestingRowId(null)
        } else {
          toast.error('Failed to send test message', { description: res.error })
        }
      }
    } catch (err: any) {
      toast.error('Test execution failed', { description: err.message })
    } finally {
      setIsExecutingTest(false)
    }
  }

  const renderInlineTestBar = (type: 'email' | 'wa', target: string) => (
    <div className="mt-3 pt-3 border-t border-[#e8ecf2] space-y-2.5 bg-[#f8fafc] p-3 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#0f1d33] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#1e3a5f]" />
          Select Cron Slot to Simulate
        </span>
        <button
          type="button"
          onClick={() => setTestingRowId(null)}
          className="text-xs text-gray-400 hover:text-gray-600 p-0.5"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <select
            value={selectedTestHour}
            onChange={(e) => setSelectedTestHour(e.target.value)}
            className="w-full appearance-none rounded-lg border border-[#cbd5e1] bg-white pl-3 pr-8 py-2 text-xs font-medium text-[#0f1d33] outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] cursor-pointer"
          >
            <option value="current">Current Real-Time (Live leads right now)</option>
            <option value="6">6:00 AM IST (Master Report - All-Time Database Leads)</option>
            <option value="9">9:00 AM IST (Window: 6:00 AM - 9:00 AM)</option>
            <option value="12">12:00 PM IST (Window: 9:00 AM - 12:00 PM)</option>
            <option value="15">3:00 PM IST (Window: 12:00 PM - 3:00 PM)</option>
            <option value="18">6:00 PM IST (Master Report - All-Time Database Leads)</option>
            <option value="21">9:00 PM IST (Window: 6:00 PM - 9:00 PM)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>

        <button
          type="button"
          disabled={isExecutingTest}
          onClick={() => handleExecuteInlineTest(type, target)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#0f1d33] rounded-lg transition-colors disabled:opacity-50 shrink-0"
        >
          {isExecutingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Send Test
        </button>
      </div>

      <p className="text-[11px] text-[#5a6a82] leading-relaxed">
        {selectedTestHour === '6' || selectedTestHour === '18'
          ? 'Master Slot: Generates the comprehensive Excel report containing all leads in the CRM database.'
          : selectedTestHour === 'current'
          ? 'Current Slot: Evaluates leads based on current live clock time.'
          : '3-Hour Delta Slot: Queries leads captured strictly within this 3-hour window.'}
      </p>
    </div>
  )

  return (
    <div className="p-1 md:p-2 h-full flex flex-col relative overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
          <Blocks className="w-6 h-6 text-[#c4a55a]" />
          Modules
        </h1>
        <p className="text-[#5a6a82] text-sm mt-1">
          Configure and manage CRM system modules.
        </p>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pb-20">
        
        {/* Left Column */}
        <div className="space-y-6">
          {/* Module: Website Downloads OTP */}
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
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Module: Automated Report Emails */}
          <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#f3f5f8] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#1e3a5f]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0f1d33]">Automated Report Emails</h3>
                  <p className="text-xs text-[#5a6a82]">Manage recipients for cron job reports</p>
                </div>
              </div>
              
              <div className="text-sm text-[#5a6a82] mb-6 space-y-2">
                <p>
                  Add email addresses below to receive the automated PDF and Excel CRM reports.
                </p>
                <p className="font-medium text-[#1e3a5f] bg-[#f3f5f8] px-3 py-2 rounded-lg inline-block text-xs border border-[#e8ecf2]">
                  <Clock className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                  <strong>Schedule (IST):</strong> 6:00 AM, 9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM, and 9:00 PM
                </p>
              </div>

              {!showOtpField ? (
                <form onSubmit={handleSendOtp} className="flex gap-3 mb-6">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter email address..."
                    className="flex-1 rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSendingOtp || !newEmail}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f1d33] disabled:opacity-50 transition-colors"
                  >
                    {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Verify
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
                  <form onSubmit={handleVerifyOtp} className="flex gap-3">
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
                onClick={() => setActiveModal('email')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-[#e8ecf2] bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#1e3a5f] font-semibold text-sm transition-colors"
              >
                <Users className="w-4 h-4" />
                Manage Recipients ({recipients.length + 1})
              </button>
            </div>
          </div>

          {/* Module: WhatsApp Reports */}
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

              <form onSubmit={handleAddWa} className="space-y-3 mb-6">
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
                onClick={() => setActiveModal('wa')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-[#e8ecf2] bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#1e3a5f] font-semibold text-sm transition-colors"
              >
                <Users className="w-4 h-4" />
                Manage Recipients ({waRecipients.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recipient Management Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-hidden">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90dvh] md:max-h-[85vh]">
            
            <div className="p-5 border-b border-[#e8ecf2] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {activeModal === 'email' ? (
                  <div className="w-10 h-10 rounded-lg bg-[#f3f5f8] flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-[#1e3a5f]" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-[#0f1d33] text-lg">
                    Manage {activeModal === 'email' ? 'Email' : 'WhatsApp'} Recipients
                  </h3>
                  <p className="text-xs text-[#5a6a82]">
                    {activeModal === 'email' ? `${recipients.length + 1} Addresses` : `${waRecipients.length} Phone Numbers`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 pb-8 overflow-y-auto flex-1 space-y-3 bg-[#f8fafc] rounded-b-2xl">
              
              {activeModal === 'email' && (
                <>
                  {/* Always display the master admin email */}
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
                          onClick={() => handleToggleInlineTest('default-1')}
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
                    {testingRowId === 'default-1' && renderInlineTestBar('email', 'bhuwanta9@gmail.com')}
                  </div>

                  {/* Map through custom recipients if any */}
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
                            onClick={() => handleToggleInlineTest(r.id)}
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
                            onClick={() => handleDeleteEmail(r.id, r.email)}
                            disabled={deletingEmailId === r.id}
                            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {deletingEmailId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Remove
                          </button>
                        </div>
                      </div>
                      {testingRowId === r.id && renderInlineTestBar('email', r.email)}
                    </div>
                  ))}
                </>
              )}

              {activeModal === 'wa' && (
                <>
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
                              onClick={() => setEditingWaId(null)}
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
                              onClick={() => setEditingWaId(null)}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveWaEdit(r.id)}
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
                              onClick={() => handleStartEditWa(r)}
                              className="inline-flex items-center justify-center gap-1 text-xs font-medium text-gray-700 hover:text-[#1e3a5f] px-2.5 py-1.5 rounded-lg border border-[#e8ecf2] hover:bg-gray-50 transition-colors"
                              title="Edit Name & Phone Number"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleInlineTest(r.id)}
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
                              onClick={() => handleDeleteWa(r.id, r.phone_number)}
                              disabled={deletingWaId === r.id}
                              className="inline-flex items-center justify-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                              title="Remove Recipient"
                            >
                              {deletingWaId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              Remove
                            </button>
                          </div>
                        </div>
                        {testingRowId === r.id && renderInlineTestBar('wa', r.phone_number)}
                      </div>
                    )
                  })}
                </>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

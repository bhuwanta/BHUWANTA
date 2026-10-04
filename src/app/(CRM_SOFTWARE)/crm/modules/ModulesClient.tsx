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
  Users
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
  
  const [testingEmailId, setTestingEmailId] = useState<string | null>(null)
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null)

  // WhatsApp Flow States
  const [newWaNumber, setNewWaNumber] = useState('')
  const [isAddingWa, setIsAddingWa] = useState(false)
  const [deletingWaId, setDeletingWaId] = useState<string | null>(null)
  const [testingWaId, setTestingWaId] = useState<string | null>(null)

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

  const handleTestEmail = async (id: string, email: string) => {
    if (!window.confirm(`Send a test report email to ${email}?`)) return
    
    setTestingEmailId(id)
    const res = await testReportEmail(email)
    if (res.success) {
      toast.success(`Test report sent to ${email}`)
    } else {
      toast.error('Failed to send test email', { description: res.error })
    }
    setTestingEmailId(null)
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
    const res = await addWaRecipient(fullNumber)
    if (res.success) {
      toast.success('WhatsApp number added!')
      setWaRecipients([
        ...waRecipients, 
        { id: Date.now().toString(), phone_number: fullNumber, name: null, created_at: new Date().toISOString() }
      ])
      setNewWaNumber('')
    } else {
      toast.error('Failed to add number', { description: res.error })
    }
    setIsAddingWa(false)
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

  const handleTestWa = async (id: string, phone: string) => {
    if (!window.confirm(`Send a test report WhatsApp message to ${phone}?`)) return
    
    setTestingWaId(id)
    const { testReportWa } = await import('./actions')
    const res = await testReportWa(phone)
    if (res.success) {
      toast.success(`Test report sent to ${phone}`)
    } else {
      toast.error('Failed to send test message', { description: res.error })
    }
    setTestingWaId(null)
  }

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

              <form onSubmit={handleAddWa} className="flex gap-3 mb-6">
                <div className="flex-1 relative">
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
                <button
                  type="submit"
                  disabled={isAddingWa || newWaNumber.length !== 10}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isAddingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-[#c4a55a] bg-[#c4a55a]/5 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#0f1d33] break-all">bhuwanta9@gmail.com</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#c4a55a] bg-white border border-[#c4a55a] px-2 py-0.5 rounded-full">Default</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTestEmail('default-1', 'bhuwanta9@gmail.com')}
                        disabled={testingEmailId === 'default-1'}
                        className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1 text-xs font-medium text-[#c4a55a] hover:text-[#a38848] px-3 py-1.5 rounded bg-[#c4a55a]/10 hover:bg-[#c4a55a]/20 transition-colors disabled:opacity-50"
                      >
                        {testingEmailId === 'default-1' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Test
                      </button>
                      <button
                        disabled
                        title="Master admin cannot be removed."
                        className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1 text-xs font-medium text-gray-400 px-3 py-1.5 rounded bg-gray-100 cursor-not-allowed"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Map through custom recipients if any */}
                  {recipients.map((r) => (
                    <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-[#e8ecf2] bg-white shadow-sm gap-3">
                      <span className="text-sm font-medium text-[#0f1d33] break-all">{r.email}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleTestEmail(r.id, r.email)}
                          disabled={testingEmailId === r.id}
                          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1 text-xs font-medium text-[#c4a55a] hover:text-[#a38848] px-3 py-1.5 rounded bg-[#c4a55a]/10 hover:bg-[#c4a55a]/20 transition-colors disabled:opacity-50"
                        >
                          {testingEmailId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Test
                        </button>
                        <button
                          onClick={() => handleDeleteEmail(r.id, r.email)}
                          disabled={deletingEmailId === r.id}
                          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {deletingEmailId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Remove
                        </button>
                      </div>
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
                    const formattedPhone = r.phone_number.startsWith('91') ? r.phone_number.slice(2) : r.phone_number;
                    return (
                      <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-[#e8ecf2] bg-white shadow-sm gap-3">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-[#0f1d33]">+91 {formattedPhone}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleTestWa(r.id, r.phone_number)}
                            disabled={testingWaId === r.id}
                            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1 text-xs font-medium text-[#c4a55a] hover:text-[#a38848] px-3 py-1.5 rounded bg-[#c4a55a]/10 hover:bg-[#c4a55a]/20 transition-colors disabled:opacity-50"
                          >
                            {testingWaId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Test
                          </button>
                          <button
                            onClick={() => handleDeleteWa(r.id, r.phone_number)}
                            disabled={deletingWaId === r.id}
                            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {deletingWaId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            Remove
                          </button>
                        </div>
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

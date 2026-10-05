'use client'

import React, { useState, useTransition } from 'react'
import { Blocks } from 'lucide-react'
import { toast } from 'sonner'
import { 
  toggleOtpModuleStatus, 
  removeReportRecipient, 
  updateReportRecipient,
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

import OtpDownloadModule from './components/OtpDownloadModule'
import EmailReportsModule from './components/EmailReportsModule'
import WhatsAppReportsModule from './components/WhatsAppReportsModule'
import EmailRecipientsModal from './components/EmailRecipientsModal'
import WhatsAppRecipientsModal from './components/WhatsAppRecipientsModal'

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
  
  // Modal State ('email' | 'wa' | null)
  const [activeModal, setActiveModal] = useState<'email' | 'wa' | null>(null)

  // Add Email Flow States
  const [newEmailName, setNewEmailName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [showOtpField, setShowOtpField] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null)
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null)
  const [editEmailName, setEditEmailName] = useState('')
  const [editEmailAddress, setEditEmailAddress] = useState('')
  const [isSavingEmailEdit, setIsSavingEmailEdit] = useState(false)

  // Inline Test Trigger States
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

  // --- OTP Toggle Handler ---
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

  // --- Email Handlers ---
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
    const trimmedEmail = newEmail.toLowerCase().trim()
    const trimmedName = newEmailName.trim() || null
    const res = await verifyAndAddEmail(trimmedEmail, otpCode.trim(), trimmedName)
    if (res.success) {
      toast.success('Email verified and added!')
      setRecipients([
        ...recipients, 
        { 
          id: Date.now().toString(), 
          email: trimmedEmail, 
          name: trimmedName, 
          created_at: new Date().toISOString() 
        }
      ])
      setNewEmail('')
      setNewEmailName('')
      setOtpCode('')
      setShowOtpField(false)
    } else {
      toast.error('Verification failed', { description: res.error })
    }
    setIsVerifying(false)
  }

  const handleStartEditEmail = (r: ReportRecipient) => {
    if (testingRowId === r.id) setTestingRowId(null)
    setEditingEmailId(r.id)
    setEditEmailName(r.name || '')
    setEditEmailAddress(r.email)
  }

  const handleSaveEmailEdit = async (id: string) => {
    setIsSavingEmailEdit(true)
    const trimmedName = editEmailName.trim() || null
    const trimmedEmail = editEmailAddress.trim().toLowerCase()
    const isMaster = id === 'master-admin-default' || trimmedEmail === 'bhuwanta9@gmail.com'

    const res = await updateReportRecipient(id, {
      name: trimmedName,
      email: trimmedEmail || undefined
    })

    if (res.success) {
      toast.success('Recipient updated successfully!')
      setRecipients(prev => {
        const hasMaster = prev.some(r => r.email.toLowerCase() === 'bhuwanta9@gmail.com')
        if (isMaster && !hasMaster) {
          return [
            { id: '8afdf3c6-c3c9-4dba-bfac-cc8fc2446e3f', email: 'bhuwanta9@gmail.com', name: trimmedName, created_at: new Date().toISOString() },
            ...prev
          ]
        }
        return prev.map(r => (r.id === id || (isMaster && r.email.toLowerCase() === 'bhuwanta9@gmail.com')) ? {
          ...r,
          name: trimmedName,
          email: trimmedEmail || r.email
        } : r)
      })
      setEditingEmailId(null)
    } else {
      toast.error('Failed to update recipient', { description: res.error })
    }
    setIsSavingEmailEdit(false)
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
        {/* Left Column: Downloads OTP */}
        <div className="space-y-6">
          <OtpDownloadModule
            otpEnabled={otpEnabled}
            isPending={isPending}
            onToggleOtp={handleToggleOtp}
          />
        </div>

        {/* Right Column: Reports Modules */}
        <div className="space-y-6">
          <EmailReportsModule
            recipientsCount={recipients.some(r => r.email.toLowerCase() === 'bhuwanta9@gmail.com') ? recipients.length : recipients.length + 1}
            newName={newEmailName}
            setNewName={setNewEmailName}
            newEmail={newEmail}
            setNewEmail={setNewEmail}
            isSendingOtp={isSendingOtp}
            showOtpField={showOtpField}
            setShowOtpField={setShowOtpField}
            otpCode={otpCode}
            setOtpCode={setOtpCode}
            isVerifying={isVerifying}
            onSendOtp={handleSendOtp}
            onVerifyOtp={handleVerifyOtp}
            onOpenManageModal={() => setActiveModal('email')}
          />

          <WhatsAppReportsModule
            recipientsCount={waRecipients.length}
            newWaName={newWaName}
            setNewWaName={setNewWaName}
            newWaNumber={newWaNumber}
            setNewWaNumber={setNewWaNumber}
            isAddingWa={isAddingWa}
            onAddWa={handleAddWa}
            onOpenManageModal={() => setActiveModal('wa')}
          />
        </div>
      </div>

      {/* Modals */}
      <EmailRecipientsModal
        isOpen={activeModal === 'email'}
        onClose={() => {
          setActiveModal(null)
          setTestingRowId(null)
          setEditingEmailId(null)
        }}
        recipients={recipients}
        editingEmailId={editingEmailId}
        editEmailName={editEmailName}
        setEditEmailName={setEditEmailName}
        editEmailAddress={editEmailAddress}
        setEditEmailAddress={setEditEmailAddress}
        isSavingEmailEdit={isSavingEmailEdit}
        onStartEditEmail={handleStartEditEmail}
        onSaveEmailEdit={handleSaveEmailEdit}
        onCancelEditEmail={() => setEditingEmailId(null)}
        testingRowId={testingRowId}
        onToggleInlineTest={handleToggleInlineTest}
        selectedTestHour={selectedTestHour}
        onSelectTestHour={setSelectedTestHour}
        isExecutingTest={isExecutingTest}
        onExecuteInlineTest={handleExecuteInlineTest}
        onCancelInlineTest={() => setTestingRowId(null)}
        deletingEmailId={deletingEmailId}
        onDeleteEmail={handleDeleteEmail}
      />

      <WhatsAppRecipientsModal
        isOpen={activeModal === 'wa'}
        onClose={() => {
          setActiveModal(null)
          setTestingRowId(null)
          setEditingWaId(null)
        }}
        waRecipients={waRecipients}
        editingWaId={editingWaId}
        editWaName={editWaName}
        setEditWaName={setEditWaName}
        editWaPhone={editWaPhone}
        setEditWaPhone={setEditWaPhone}
        isSavingWaEdit={isSavingWaEdit}
        onStartEditWa={handleStartEditWa}
        onSaveWaEdit={handleSaveWaEdit}
        onCancelEditWa={() => setEditingWaId(null)}
        testingRowId={testingRowId}
        onToggleInlineTest={handleToggleInlineTest}
        selectedTestHour={selectedTestHour}
        onSelectTestHour={setSelectedTestHour}
        isExecutingTest={isExecutingTest}
        onExecuteInlineTest={handleExecuteInlineTest}
        onCancelInlineTest={() => setTestingRowId(null)}
        deletingWaId={deletingWaId}
        onDeleteWa={handleDeleteWa}
      />
    </div>
  )
}

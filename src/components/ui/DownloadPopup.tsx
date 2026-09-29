'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Download } from 'lucide-react'
import Image from 'next/image'
import logoImg from '@/images/bhuwanta-logo-horizontal.png'
import type { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth'
import { loadPhoneAuth } from '@/lib/firebase/phone-otp'
import { createOtpVerificationSession } from '@/lib/firebase/otp-verification'
import { normalizeIndianPhoneInput } from '@/lib/phone-input'
import { submitContactLead } from '@/lib/lead-submission'
import { getLeadAttribution } from '@/lib/lead-attribution'
import { trackDocumentDownload } from '@/lib/gtag'
import { documentDownloadHref } from '@/lib/document-links'

interface DownloadPopupProps {
  isOpen: boolean
  onClose: () => void
  urls: string[]
  projectName: string
  documentType: string
}

export function DownloadPopup({ isOpen, onClose, urls, projectName, documentType }: DownloadPopupProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [error, setError] = useState('')
  const [downloadReady, setDownloadReady] = useState(false)

  // Owned by this component instance rather than shared through
  // window.recaptchaVerifier. That global is also used by ContactForm,
  // LeadPopup and GatedResource, each binding it to a different container —
  // so whichever closed last would call .clear() on a verifier another form
  // still owned, and that form's next attempt built a fresh widget onto a
  // container holding a dead one. Firebase rejects the resulting token as
  // auth/invalid-app-credential.
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null)
  const verificationRef = useRef(createOtpVerificationSession())

  const clearRecaptcha = useCallback(() => {
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.clear()
      } catch {
        // already torn down
      }
      recaptchaRef.current = null
    }
    recaptchaContainerRef.current?.replaceChildren()
  }, [])

  useEffect(() => {
    const verification = verificationRef.current
    return () => {
      clearRecaptcha()
      verification.reset()
    }
  }, [clearRecaptcha])

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })

  // Reset state and handle background scrolling
  useEffect(() => {
    // Reset on both close and open so a consumed code is never shown on reopen.
    queueMicrotask(() => {
      setIsSubmitting(false)
      setPhoneError('')
      setError('')
      setDownloadReady(false)
      setStep(1)
      setOtp('')
      setConfirmationResult(null)
      setFormData({ name: '', phone: '' })
    })
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      clearRecaptcha()
      verificationRef.current.reset()
    }
    
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [isOpen, clearRecaptcha])

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit number')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { auth, RecaptchaVerifier, signInWithPhoneNumber } = await loadPhoneAuth()
      clearRecaptcha()
      verificationRef.current.reset()
      const container = recaptchaContainerRef.current
      if (!container) throw new Error('Please try requesting your code again.')
      recaptchaRef.current = new RecaptchaVerifier(auth, container, { size: 'invisible' })

      const formattedPhone = `+91${formData.phone}`
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaRef.current)
      setConfirmationResult(confirmation)
      setOtp('')
      setStep(2)
    } catch (err: unknown) {
      console.error(err)
      setError((err instanceof Error ? err.message : null) || 'Failed to send OTP.')
      // A failed attempt leaves a spent widget behind; the next try must build
      // a fresh one or it fails the same way.
      clearRecaptcha()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmationResult || !otp) return

    setIsSubmitting(true)
    setError('')
    let verified = false

    try {
      await verificationRef.current.verify(confirmationResult, otp)
      verified = true

      const data = await submitContactLead({
        attribution: getLeadAttribution(),
        ...formData,
        project: projectName,
        enquiryType: `Document Download: ${documentType}`,
        message: `Requested to download ${documentType} for ${projectName}`,
        sourcePage: 'Website Document Download',
      })
      trackDocumentDownload(data.leadId)
      clearRecaptcha()
      setDownloadReady(true)
    } catch (err: unknown) {
      console.error('Submission error:', err)
      setError(verified
        ? 'Your phone is verified, but we could not confirm your request was saved. Please retry.'
        : 'We could not verify that code. Please check it or request a new one.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null
  const documentLinks = urls.map(documentDownloadHref).filter((href): href is string => Boolean(href))

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-brand-deep px-6 py-6 flex flex-col items-center justify-center text-center relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/60 hover:text-white bg-white/5 hover:bg-white/20 rounded-full transition-all z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <Image src={logoImg} alt="Bhuwanta Developers: Your Land. Your Legacy." className="h-16 w-auto rounded-md" sizes="176px" />
          <h2 className="download-popup-title">Download {documentType}</h2>
          <p className="text-white/80 text-xs sm:text-sm mt-1">{projectName}</p>
        </div>

        {/* Form */}
        <div className="px-6 py-6 sm:py-7">
          <div ref={recaptchaContainerRef} />
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-4 text-center">
              {error}
            </div>
          )}

          {downloadReady ? (
            <div className="space-y-4 text-center" role="status">
              <h3 className="text-lg font-semibold text-brand-deep">Your request is saved</h3>
              <p className="text-sm text-brand-muted">
                {documentLinks.length ? 'Open your documents below.' : 'The documents are currently unavailable. Our team can help you with them.'}
              </p>
              {documentLinks.map((href, index) => (
                <a
                  key={`${href}-${index}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 btn-solid"
                >
                  <Download className="w-4 h-4" />
                  Open {documentType}{documentLinks.length > 1 ? ` ${index + 1}` : ''}
                </a>
              ))}
              <button type="button" onClick={onClose} className="w-full py-3 rounded-xl border border-brand-border text-brand-deep font-medium">
                Done
              </button>
            </div>
          ) : step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-brand-deep/70">Please enter your details to access this document.</p>
              </div>
              <div className="space-y-3">
                <input
                  required
                  type="text"
                  placeholder="Full Name *"
                  className="w-full px-4 py-3 bg-brand-paper border border-brand-border rounded-xl text-sm text-brand-deep placeholder:text-brand-deep/40 focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep/50 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />

                <div>
                  <input
                    required
                    type="tel"
                    placeholder="Phone Number *"
                    minLength={10}
                    pattern="[0-9]{10}"
                    className={`w-full px-4 py-3 bg-brand-paper border ${phoneError ? 'border-red-500 focus:ring-red-500' : 'border-brand-border focus:ring-brand-deep/20'} rounded-xl text-sm text-brand-deep placeholder:text-brand-deep/40 focus:outline-none focus:ring-2 focus:border-brand-deep/50 transition-all`}
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      const digitsOnly = normalizeIndianPhoneInput(val);
                      if (digitsOnly.length > 10) {
                        setPhoneError('Please enter 10 digits only');
                      } else {
                        setPhoneError('');
                      }
                      setFormData({ ...formData, phone: digitsOnly });
                    }}
                  />
                  {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled={isSubmitting}
                  className="w-full py-3 sm:py-3.5 text-sm sm:text-base rounded-xl active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 btn-solid"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending OTP...
                    </span>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Verify to Download
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-brand-deep/40 mt-3 font-medium">
                  Your information is kept 100% confidential.
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-brand-deep/70">Enter the 6-digit code sent to +91 {formData.phone}</p>
              </div>
              
              <input
                required
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 bg-brand-paper border border-brand-border rounded-xl text-center tracking-[0.3em] text-lg font-semibold text-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep/50 transition-all"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    clearRecaptcha()
                    verificationRef.current.reset()
                    setConfirmationResult(null)
                    setOtp('')
                    setError('')
                    setStep(1)
                  }}
                  disabled={isSubmitting}
                  className="w-1/3 py-3 sm:py-3.5 bg-brand-paper border border-brand-border text-brand-deep text-sm sm:text-base font-semibold rounded-xl hover:bg-gray-100 transition-all disabled:opacity-70"
                >
                  Back
                </button>
                <button
                  disabled={isSubmitting || otp.length < 6}
                  className="w-2/3 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 btn-solid"
                >
                  {isSubmitting ? 'Verifying...' : 'Submit & Download'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}

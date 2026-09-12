'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Download } from 'lucide-react'
import Image from 'next/image'
import logoImg from '@/images/logo.png'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'

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

  // Owned by this component instance rather than shared through
  // window.recaptchaVerifier. That global is also used by ContactForm,
  // LeadPopup and GatedResource, each binding it to a different container —
  // so whichever closed last would call .clear() on a verifier another form
  // still owned, and that form's next attempt built a fresh widget onto a
  // container holding a dead one. Firebase rejects the resulting token as
  // auth/invalid-app-credential.
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

  const clearRecaptcha = () => {
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.clear()
      } catch {
        // already torn down
      }
      recaptchaRef.current = null
    }
    const container = document.getElementById('download-recaptcha-container')
    if (container) container.innerHTML = ''
  }

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    referredBy: '',
  })

  // Reset state and handle background scrolling
  useEffect(() => {
    if (isOpen) {
      // Batch state resets outside synchronous effect to avoid cascading renders
      queueMicrotask(() => {
        setIsSubmitting(false)
        setPhoneError('')
        setError('')
        setStep(1)
        setOtp('')
        setFormData({ name: '', phone: '', email: '', referredBy: '' })
      })
      
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      clearRecaptcha()
    }
    
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [isOpen])

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit number')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'download-recaptcha-container', {
          size: 'invisible',
        })
      }

      const formattedPhone = `+91${formData.phone}`
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaRef.current)
      setConfirmationResult(confirmation)
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

    try {
      // 1. Verify OTP
      await confirmationResult.confirm(otp)

      // 2. Open documents IMMEDIATELY in a new tab
      if (urls && urls.length > 0) {
        urls.forEach((url) => {
          if (url.toLowerCase().includes('.pdf')) {
            window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(url)}`, '_blank')
          } else {
            window.open(url, '_blank')
          }
        })
      }

      // 3. Save lead
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          project: projectName,
          enquiryType: `Document Download: ${documentType}`,
          message: `Requested to download ${documentType} for ${projectName}`,
          sourcePage: 'Website Document Download',
        }),
      })

      onClose() // Close the popup immediately after success
    } catch (err: unknown) {
      console.error('Submission error:', err)
      setError('Invalid OTP or submission error.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

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
        <div className="bg-[#002935] px-6 py-6 flex flex-col items-center justify-center text-center relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/60 hover:text-white bg-white/5 hover:bg-white/20 rounded-full transition-all z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div
            className="w-40 sm:w-48 h-12 sm:h-16 mb-4"
            style={{
              WebkitMaskImage: `url(${logoImg.src})`,
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              backgroundColor: '#c4a55a' // Gold color from Tailwind config
            }}
            aria-label="Bhuwanta"
          />
          <h2 className="text-white font-semibold text-lg sm:text-xl">Download {documentType}</h2>
          <p className="text-white/80 text-xs sm:text-sm mt-1">{projectName}</p>
        </div>

        {/* Form */}
        <div className="px-6 py-6 sm:py-7">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-4 text-center">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-[#002935]/70">Please enter your details to access this document.</p>
              </div>
              <div className="space-y-3">
                <input
                  required
                  type="text"
                  placeholder="Full Name *"
                  className="w-full px-4 py-3 bg-[#f8f9fb] border border-[#e8ecf2] rounded-xl text-sm text-[#002935] placeholder:text-[#002935]/40 focus:outline-none focus:ring-2 focus:ring-[#002935]/20 focus:border-[#002935]/50 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      required
                      type="tel"
                      placeholder="Phone Number *"
                      minLength={10}
                      pattern="[0-9]{10}"
                      className={`w-full px-4 py-3 bg-[#f8f9fb] border ${phoneError ? 'border-red-500 focus:ring-red-500' : 'border-[#e8ecf2] focus:ring-[#002935]/20'} rounded-xl text-sm text-[#002935] placeholder:text-[#002935]/40 focus:outline-none focus:ring-2 focus:border-[#002935]/50 transition-all`}
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        const digitsOnly = val.replace(/\D/g, '');
                        if (val !== digitsOnly || digitsOnly.length > 10) {
                          setPhoneError('Please enter 10 digits only');
                        } else {
                          setPhoneError('');
                        }
                        setFormData({ ...formData, phone: digitsOnly.slice(0, 10) });
                      }}
                    />
                    {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                  </div>
                  <input
                    required
                    type="email"
                    placeholder="Email Address *"
                    className="w-full px-4 py-3 bg-[#f8f9fb] border border-[#e8ecf2] rounded-xl text-sm text-[#002935] placeholder:text-[#002935]/40 focus:outline-none focus:ring-2 focus:ring-[#002935]/20 focus:border-[#002935]/50 transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <input
                  type="text"
                  placeholder="Referred by (Optional)"
                  className="w-full px-4 py-3 bg-[#f8f9fb] border border-[#e8ecf2] rounded-xl text-sm text-[#002935] placeholder:text-[#002935]/40 focus:outline-none focus:ring-2 focus:ring-[#002935]/20 focus:border-[#002935]/50 transition-all"
                  value={formData.referredBy}
                  onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                />
              </div>

              <div id="download-recaptcha-container"></div>

              <div className="pt-2">
                <button
                  disabled={isSubmitting}
                  className="w-full py-3 sm:py-3.5 bg-[#c4a55a] text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-[#b59853] hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
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
                <p className="text-[11px] text-center text-[#002935]/40 mt-3 font-medium">
                  Your information is kept 100% confidential.
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-[#002935]/70">Enter the 6-digit code sent to +91 {formData.phone}</p>
              </div>
              
              <input
                required
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 bg-[#f8f9fb] border border-[#e8ecf2] rounded-xl text-center tracking-[0.3em] text-lg font-semibold text-[#002935] focus:outline-none focus:ring-2 focus:ring-[#002935]/20 focus:border-[#002935]/50 transition-all"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="w-1/3 py-3 sm:py-3.5 bg-[#f8f9fb] border border-[#e8ecf2] text-[#002935] text-sm sm:text-base font-semibold rounded-xl hover:bg-gray-100 transition-all disabled:opacity-70"
                >
                  Back
                </button>
                <button
                  disabled={isSubmitting || otp.length < 6}
                  className="w-2/3 py-3 sm:py-3.5 bg-[#c4a55a] text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-[#b59853] hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
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

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import logoImg from '@/images/logo.png'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { fireLeadConversion } from '@/lib/gtag'

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | null;
  }
}

export function LeadPopup({ projectsList = [], locationNames = [] }: { projectsList?: { name: string, location: string }[], locationNames?: string[] }) {
  const [isOpen, setIsOpen] = useState(false)

  // Scoped to this component instead of window.recaptchaVerifier. That global
  // was shared by every OTP form while each bound it to a different container,
  // so whichever form ran its teardown last destroyed a verifier another form
  // still owned. The next attempt then built a fresh widget onto a container
  // holding a dead one, and Firebase rejected the token with
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
    const container = document.getElementById('recaptcha-container-popup')
    if (container) container.innerHTML = ''
  }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  
  const [step, setStep] = useState<1 | 2>(1)
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    location: 'All',
    project: 'Not Sure',
    enquiryType: 'Site Visit',
    message: '',
    referredBy: '',
  })

  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  // Handle background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
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
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-popup', {
          size: 'invisible',
        })
      }

      const formattedPhone = `+91${formData.phone}`
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaRef.current)
      setConfirmationResult(confirmation)
      setStep(2)
    } catch (err: unknown) {
      console.error('Firebase OTP Error:', err)
      setError((err instanceof Error ? err.message : null) || 'Failed to send OTP. Please try again.')
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
      await confirmationResult.confirm(otp)

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sourcePage: 'Website Popup',
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        fireLeadConversion()
        setTimeout(() => setIsOpen(false), 3000)
      } else {
        throw new Error('Failed to send message.')
      }

      clearRecaptcha()
    } catch (err: unknown) {
      console.error(err)
      setError('Invalid OTP or error submitting form. Please try again.')
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
        onClick={() => setIsOpen(false)}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto"
      >
        <div id="recaptcha-container-popup"></div>

        {/* Header */}
        <div className="bg-[#002935] px-6 py-6 flex flex-col items-center justify-center text-center relative shrink-0">
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-1.5 text-white/60 hover:text-white bg-white/5 hover:bg-white/20 rounded-full transition-all z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Logo */}
          <div
            className="w-56 sm:w-72 h-16 sm:h-20"
            style={{
              WebkitMaskImage: `url(${logoImg.src})`,
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              backgroundColor: '#c4a55a' // Gold color from Tailwind config
            }}
            aria-label="Bhuwanta"
          />
        </div>

        {/* Form / Success States */}
        <div className="px-6 py-6 sm:py-7">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              step === 1 ? (
                <motion.form
                  key="form-step-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleSendOTP}
                  className="space-y-4"
                >
                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-4">
                      {error}
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <input
                      required
                      type="text"
                      placeholder="Full Name *"
                      aria-label="Full Name"
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
                          aria-label="Phone Number"
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
                        {phoneError && <p className="text-red-500 text-[10px] mt-1">{phoneError}</p>}
                      </div>
                      <input
                        required
                        type="email"
                        placeholder="Email Address *"
                        aria-label="Email Address"
                        className="w-full px-4 py-3 bg-[#f8f9fb] border border-[#e8ecf2] rounded-xl text-sm text-[#002935] placeholder:text-[#002935]/40 focus:outline-none focus:ring-2 focus:ring-[#002935]/20 focus:border-[#002935]/50 transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="relative">
                      <select
                        aria-label="Select location"
                        className="w-full appearance-none px-4 py-3 bg-[#f8f9fb] border border-[#e8ecf2] rounded-xl text-sm text-[#002935] focus:outline-none focus:ring-2 focus:ring-[#002935]/20 focus:border-[#002935]/50 transition-all"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value, project: 'Not Sure' })}
                      >
                        <option value="All">Location: All</option>
                        {locationNames.map((name, idx) => (
                          <option key={idx} value={name}>{name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#002935]/40">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                      </div>
                    </div>

                    <div className="relative">
                      <select
                        aria-label="Select project"
                        className="w-full appearance-none px-4 py-3 bg-[#f8f9fb] border border-[#e8ecf2] rounded-xl text-sm text-[#002935] focus:outline-none focus:ring-2 focus:ring-[#002935]/20 focus:border-[#002935]/50 transition-all"
                        value={formData.project}
                        onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                      >
                        <option value="Not Sure">Project: Not Sure</option>
                        {Array.from(new Set(
                          projectsList
                            .filter(p => (formData.location && formData.location !== 'All') ? p.location === formData.location : true)
                            .map(p => p.name)
                        )).map((name, idx) => (
                          <option key={idx} value={name}>{name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#002935]/40">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Referred by (Optional)"
                      aria-label="Referred by"
                      className="w-full px-4 py-3 bg-[#f8f9fb] border border-[#e8ecf2] rounded-xl text-sm text-[#002935] placeholder:text-[#002935]/40 focus:outline-none focus:ring-2 focus:ring-[#002935]/20 focus:border-[#002935]/50 transition-all"
                      value={formData.referredBy}
                      onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                    />

                    <textarea
                      placeholder="Your Message (Optional)"
                      rows={2}
                      aria-label="Your message"
                      className="w-full px-4 py-3 bg-[#f8f9fb] border border-[#e8ecf2] rounded-xl text-sm text-[#002935] placeholder:text-[#002935]/40 focus:outline-none focus:ring-2 focus:ring-[#002935]/20 focus:border-[#002935]/50 transition-all resize-none"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      disabled={isSubmitting}
                      className="w-full py-3 sm:py-3.5 bg-[#002935] text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-[#003d4f] hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center"
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
                        'Book Visit'
                      )}
                    </button>
                    <p className="text-[11px] text-center text-[#002935]/40 mt-3 font-medium">
                      Your information is kept 100% confidential.
                    </p>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="form-step-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleVerifyOTP}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-[#002935] mb-2">Verify Your Number</h3>
                    <p className="text-sm text-[#002935]/60">We sent a 6-digit code to +91 {formData.phone}</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-4 text-center">
                      {error}
                    </div>
                  )}

                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit OTP"
                      className="w-full text-center tracking-widest text-lg font-semibold bg-[#f3f5f8] border border-[#e8ecf2] rounded-xl px-4 py-3.5 text-[#002935] focus:outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="pt-2 flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting || otp.length !== 6}
                      className="w-full py-3.5 bg-[#002935] text-white text-base font-semibold rounded-xl hover:bg-[#003d4f] hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Verifying...
                        </span>
                      ) : (
                        'Verify & Submit'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setOtp('');
                        setError('');
                      }}
                      className="text-sm font-medium text-[#002935]/60 hover:text-[#002935] transition-colors"
                    >
                      Change Phone Number
                    </button>
                  </div>
                </motion.form>
              )
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 sm:py-10"
              >
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-bold text-[#002935] mb-2">You&apos;re all set!</h3>
                <p className="text-sm text-[#002935]/60">Our team will be in touch with you shortly to confirm your visit.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

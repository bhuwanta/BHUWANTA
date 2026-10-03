'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth'
import { loadPhoneAuth } from '@/lib/firebase/phone-otp'
import { createOtpVerificationSession } from '@/lib/firebase/otp-verification'
import { createOtpRequestGate } from '@/lib/firebase/otp-request-gate'
import { normalizeIndianPhoneInput } from '@/lib/phone-input'
import { submitContactLead } from '@/lib/lead-submission'
import { matchEnquiryProject } from '@/lib/project-links'
import { getLeadAttribution } from '@/lib/lead-attribution'
import { fireLeadConversion, trackEnquiryStep } from '@/lib/gtag'
import { useOtpConfig } from '@/lib/hooks/useOtpConfig'
import Link from 'next/link'

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | null;
  }
}

export function ContactForm({
  projectsList = [],
  locationNames = [],
  initialProject,
  compact = false,
  hideTitle = false,
}: {
  projectsList?: { name: string; location: string }[]
  locationNames?: string[]
  initialProject?: string
  compact?: boolean
  hideTitle?: boolean
}) {
  const router = useRouter()
  const { isOtpEnabled } = useOtpConfig()
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)
  const otpRequestGateRef = useRef(createOtpRequestGate())
  const startedRef = useRef(false)
  const trackStart = () => {
    if (!startedRef.current) {
      startedRef.current = true
      trackEnquiryStep('start', 'contact')
    }
  }

  // Scoped to this component instead of window.recaptchaVerifier.
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

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = setInterval(() => {
      setResendSeconds(otpRequestGateRef.current.remainingSeconds(Date.now()))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendSeconds])

  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)

  // Only preselect if it's a real project name
  const selectedProject = matchEnquiryProject(projectsList, initialProject)
  const matchedProject = selectedProject?.name || 'Not Sure'
  const matchedLocation = selectedProject?.location

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: matchedLocation || 'All',
    project: matchedProject,
    agree: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    let finalValue = value
    if (name === 'phone') {
      const digitsOnly = normalizeIndianPhoneInput(value)
      if (digitsOnly.length > 10) {
        setPhoneError('Please enter 10 digits only')
      } else {
        setPhoneError('')
      }
      finalValue = digitsOnly
    }

    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : finalValue,
      }
      if (name === 'location') {
        newData.project = 'Not Sure'
      }
      return newData
    })
  }

  const requestOtp = async () => {
    if (loading) return
    if (!formData.agree) {
      setError('You must agree to the Terms & Conditions.')
      return
    }
    if (formData.phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit number')
      return
    }

    const requestGate = otpRequestGateRef.current
    if (!requestGate.tryStart(Date.now())) {
      setResendSeconds(requestGate.remainingSeconds(Date.now()))
      return
    }

    setLoading(true)
    setSendingOtp(true)
    setResendSeconds(requestGate.remainingSeconds(Date.now()))
    verificationRef.current.reset()
    setConfirmationResult(null)
    setOtp('')
    setError('')
    trackEnquiryStep('otp_requested', 'contact')
    let sent = false

    try {
      const { auth, RecaptchaVerifier, signInWithPhoneNumber } = await loadPhoneAuth()
      clearRecaptcha()
      const container = recaptchaContainerRef.current
      if (!container) throw new Error('Please try requesting your code again.')
      recaptchaRef.current = new RecaptchaVerifier(auth, container, {
        size: 'invisible',
      })

      const formattedPhone = `+91${formData.phone}`
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaRef.current)
      sent = true
      setConfirmationResult(confirmation)
      setOtp('')
      setStep(2)
      trackEnquiryStep('otp_sent', 'contact')
    } catch (err: unknown) {
      trackEnquiryStep('otp_failed', 'contact')
      const firebaseErr = err as { code?: string; message?: string }
      console.error('Firebase OTP Error:', {
        code: firebaseErr.code,
        message: firebaseErr.message,
        fullError: err,
      })
      setError(
        firebaseErr.code === 'auth/too-many-requests'
          ? 'Too many code requests. Please try again later.'
          : 'We could not send a code. Please try again when the timer ends.'
      )
      clearRecaptcha()
    } finally {
      requestGate.finish(Date.now(), sent)
      setResendSeconds(requestGate.remainingSeconds(Date.now()))
      setSendingOtp(false)
      setLoading(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!formData.agree) {
      setError('You must agree to the Terms & Conditions.')
      return
    }
    if (formData.phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit number')
      return
    }

    // When OTP is disabled in CRM modules -> Directly submit without OTP verification
    if (!isOtpEnabled) {
      setLoading(true)
      setError('')
      try {
        trackEnquiryStep('submission_started', 'contact')
        const data = await submitContactLead({
          attribution: getLeadAttribution(),
          name: formData.name,
          phone: formData.phone,
          location: formData.location,
          project: formData.project,
          enquiryType: compact ? 'Pricing Details' : 'Site Visit',
          sourcePage: `Website - ${typeof window !== 'undefined' ? window.location.pathname : ''} - Book Your Visit`,
        })

        fireLeadConversion(data.leadId)
        if (data.leadId) trackEnquiryStep('submission_succeeded', 'contact')
        router.push('/thank-you')
      } catch (err: unknown) {
        trackEnquiryStep('submission_failed', 'contact')
        console.error(err)
        setError('We could not confirm your enquiry was saved. Please retry.')
      } finally {
        setLoading(false)
      }
      return
    }

    // When OTP is enabled -> Request phone OTP via Firebase
    await requestOtp()
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || !confirmationResult || otp.length !== 6) return
    if (!otpRequestGateRef.current.tryStartVerification()) return

    setLoading(true)
    setError('')
    let verified = false

    try {
      // 1. Verify OTP with Firebase
      const newlyVerified = await verificationRef.current.verify(confirmationResult, otp)
      verified = true
      if (newlyVerified) trackEnquiryStep('otp_verified', 'contact')

      // 2. If successful, save lead to database
      trackEnquiryStep('submission_started', 'contact')
      const data = await submitContactLead({
        attribution: getLeadAttribution(),
        name: formData.name,
        phone: formData.phone,
        location: formData.location,
        project: formData.project,
        enquiryType: compact ? 'Pricing Details' : 'Site Visit',
        sourcePage: `Website - ${typeof window !== 'undefined' ? window.location.pathname : ''} - Book Your Visit`,
      })

      clearRecaptcha()

      fireLeadConversion(data.leadId)
      if (data.leadId) trackEnquiryStep('submission_succeeded', 'contact')
      router.push('/thank-you')
    } catch (err: unknown) {
      trackEnquiryStep(verified ? 'submission_failed' : 'verification_failed', 'contact')
      console.error(err)
      setError(
        verified
          ? 'Your phone is verified, but we could not confirm your enquiry was saved. Please retry.'
          : 'We could not verify that code. Please check it or request a new one.'
      )
    } finally {
      otpRequestGateRef.current.finishVerification()
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {!hideTitle && (
        <h3 className="text-2xl font-bold text-brand-ink mb-2">Request Prices or a Site Visit</h3>
      )}
      <div ref={recaptchaContainerRef} />

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium mb-6">
          {error}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleFormSubmit} onFocusCapture={trackStart} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-brand-ink mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                autoComplete="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your name"
                className="w-full bg-brand-soft border border-brand-border rounded-lg px-3 py-2.5 text-brand-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-brand-ink mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                autoComplete="tel-national"
                inputMode="numeric"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                minLength={10}
                pattern="[0-9]{10}"
                placeholder="10-digit mobile number"
                className={`w-full bg-brand-soft border ${
                  phoneError ? 'border-red-500 focus:ring-red-500' : 'border-brand-border focus:ring-brand-gold'
                } rounded-lg px-3 py-2.5 text-brand-ink text-sm focus:outline-none focus:ring-2 focus:border-transparent`}
              />
              {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
            </div>

            {!compact && (
              <>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-brand-ink mb-1">
                    Preferred Location
                  </label>
                  <div className="relative">
                    <select
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full appearance-none bg-brand-soft border border-brand-border rounded-lg pl-3 pr-10 py-2.5 text-brand-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    >
                      <option value="All">All Locations</option>
                      {locationNames.map((name, idx) => (
                        <option key={idx} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-muted">
                      <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="project" className="block text-sm font-medium text-brand-ink mb-1">
                    Project Interested In
                  </label>
                  <div className="relative">
                    <select
                      id="project"
                      name="project"
                      value={formData.project}
                      onChange={handleChange}
                      className="w-full appearance-none bg-brand-soft border border-brand-border rounded-lg pl-3 pr-10 py-2.5 text-brand-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    >
                      <option value="Not Sure">Not Sure</option>
                      {Array.from(
                        new Set(
                          projectsList
                            .filter((p) =>
                              formData.location && formData.location !== 'All'
                                ? p.location === formData.location
                                : true
                            )
                            .map((p) => p.name)
                        )
                      ).map((name, idx) => (
                        <option key={idx} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-muted">
                      <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="agree"
              name="agree"
              checked={formData.agree}
              onChange={handleChange}
              required
              className="w-4 h-4 mt-0.5 shrink-0 rounded border-brand-border text-brand-primary focus:ring-brand-gold"
            />
            <label htmlFor="agree" className="text-xs text-brand-muted leading-tight">
              I agree to the{' '}
              <Link href="/policies" target="_blank" className="underline">
                Terms &amp; Privacy Policy
              </Link>{' '}
              and to being contacted about my enquiry.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || (isOtpEnabled && resendSeconds > 0)}
            className="w-full rounded-lg py-3 px-4 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed btn-solid"
          >
            {loading
              ? isOtpEnabled
                ? sendingOtp
                  ? 'Sending code...'
                  : 'Verifying...'
                : 'Booking your visit...'
              : isOtpEnabled && resendSeconds > 0
                ? `Request new code in ${resendSeconds}s`
                : 'Book your visit →'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-5 bg-brand-paper p-6 rounded-xl border border-brand-border">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-brand-ink mb-1">Verify Phone Number</h4>
            <p className="text-sm text-brand-muted mb-4">
              {sendingOtp
                ? 'Sending a new code to'
                : confirmationResult
                  ? 'We sent a 6-digit code to'
                  : 'Request a new code for'}{' '}
              +91 {formData.phone}
            </p>
          </div>

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-brand-ink mb-1 text-center">
              Enter OTP
            </label>
            <input
              type="text"
              id="otp"
              autoComplete="one-time-code"
              inputMode="numeric"
              name="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              disabled={loading || !confirmationResult}
              placeholder="000000"
              className="w-full text-center tracking-widest text-xl bg-white border border-brand-border rounded-lg px-3 py-3 text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
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
              disabled={loading}
              className="w-full sm:w-1/2 bg-white border border-brand-border text-brand-muted font-semibold rounded-lg py-3 px-4 hover:bg-gray-50 transition-colors disabled:opacity-70"
            >
              Change number
            </button>
            <button
              type="submit"
              disabled={loading || !confirmationResult || otp.length < 6}
              className="w-full sm:w-1/2 rounded-lg py-3 px-4 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed btn-solid"
            >
              {sendingOtp ? 'Sending code...' : loading ? 'Verifying & submitting...' : 'Verify & Submit'}
            </button>
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={() => void requestOtp()}
              disabled={loading || resendSeconds > 0}
              className="min-h-11 px-3 text-sm font-semibold text-brand-primary underline disabled:no-underline disabled:text-brand-muted disabled:cursor-not-allowed"
            >
              {sendingOtp ? 'Sending code...' : resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

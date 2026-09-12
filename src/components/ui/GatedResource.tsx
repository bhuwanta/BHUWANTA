'use client'

import { useState, useEffect, useRef } from 'react'
import { Lock, Printer } from 'lucide-react'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { fireLeadConversion } from '@/lib/gtag'

export function GatedResource({
  resourceName,
  teaser,
  children,
}: {
  resourceName: string
  teaser: string
  children: React.ReactNode
}) {
  const [unlocked, setUnlocked] = useState(false)

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
    const container = document.getElementById('gated-recaptcha-container')
    if (container) container.innerHTML = ''
  }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [formData, setFormData] = useState({ name: '', phone: '', referredBy: '' })

  const [step, setStep] = useState<1 | 2>(1)
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)

  useEffect(() => {
    return () => {
      clearRecaptcha()
    }
  }, [])

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit number')
      return
    }
    setLoading(true)
    setError('')

    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'gated-recaptcha-container', {
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
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmationResult || !otp) return

    setLoading(true)
    setError('')

    try {
      await confirmationResult.confirm(otp)

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          referredBy: formData.referredBy,
          enquiryType: `Document Download: ${resourceName}`,
          sourcePage: `Lead Magnet — ${resourceName}`,
        }),
      })

      if (!res.ok) throw new Error('Failed to save your details. Please try again.')
      setUnlocked(true)
      fireLeadConversion()

      clearRecaptcha()
    } catch (err: unknown) {
      console.error(err)
      setError('Invalid OTP or submission error.')
    } finally {
      setLoading(false)
    }
  }

  if (unlocked) {
    return (
      <div>
        <div className="flex justify-end mb-6 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] transition-premium text-sm"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="bg-[#f7f8fa] border border-[#e8ecf2] rounded-2xl p-8 sm:p-12 text-center relative">
      <div id="gated-recaptcha-container"></div>
      
      <div className="w-14 h-14 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center mx-auto mb-6">
        <Lock className="w-6 h-6 text-[#1e3a5f]" />
      </div>
      <p className="text-[#5a6a82] leading-relaxed max-w-xl mx-auto mb-8">{teaser}</p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-6 max-w-sm mx-auto">
          {error}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleSendOTP} className="max-w-sm mx-auto space-y-3">
          <input
            required
            type="text"
            placeholder="Full Name *"
            aria-label="Full Name"
            className="w-full px-4 py-3 bg-white border border-[#e8ecf2] rounded-xl text-sm text-[#0f1d33] placeholder:text-[#5a6a82]/60 focus:outline-none focus:ring-2 focus:ring-[#c4a55a] transition-all"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <div>
            <input
              required
              type="tel"
              placeholder="Mobile Number *"
              aria-label="Mobile Number"
              minLength={10}
              pattern="[0-9]{10}"
              className={`w-full px-4 py-3 bg-white border ${phoneError ? 'border-red-500' : 'border-[#e8ecf2]'} rounded-xl text-sm text-[#0f1d33] placeholder:text-[#5a6a82]/60 focus:outline-none focus:ring-2 focus:ring-[#c4a55a] transition-all`}
              value={formData.phone}
              onChange={(e) => {
                const val = e.target.value
                const digitsOnly = val.replace(/\D/g, '')
                setPhoneError(val !== digitsOnly || digitsOnly.length > 10 ? 'Please enter 10 digits only' : '')
                setFormData({ ...formData, phone: digitsOnly.slice(0, 10) })
              }}
            />
            {phoneError && <p className="text-red-500 text-xs mt-1 text-left">{phoneError}</p>}
          </div>
          <input
            type="text"
            placeholder="Referred by (Optional)"
            aria-label="Referred by"
            className="w-full px-4 py-3 bg-white border border-[#e8ecf2] rounded-xl text-sm text-[#0f1d33] placeholder:text-[#5a6a82]/60 focus:outline-none focus:ring-2 focus:ring-[#c4a55a] transition-all"
            value={formData.referredBy}
            onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
          />
          <button
            disabled={loading}
            className="w-full py-3 gradient-gold text-white font-semibold rounded-xl shadow-lg shadow-[#c4a55a]/20 hover:scale-105 transition-premium disabled:opacity-70 flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending OTP...
              </span>
            ) : (
              'Unlock This Guide'
            )}
          </button>
          <p className="text-xs text-[#5a6a82]/70">Your information is kept 100% confidential.</p>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="max-w-sm mx-auto space-y-4">
          <div className="text-center mb-2">
            <h3 className="text-lg font-bold text-[#0f1d33]">Verify Your Number</h3>
            <p className="text-xs text-[#5a6a82]">Code sent to +91 {formData.phone}</p>
          </div>
          <div>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit OTP"
              className="w-full text-center tracking-widest text-lg font-semibold bg-white border border-[#e8ecf2] rounded-xl px-4 py-3.5 text-[#0f1d33] focus:outline-none focus:ring-2 focus:ring-[#c4a55a] transition-all"
              required
            />
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 gradient-gold text-white font-semibold rounded-xl shadow-lg shadow-[#c4a55a]/20 hover:scale-105 transition-premium disabled:opacity-70 flex items-center justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify & Unlock'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp('');
                setError('');
              }}
              className="text-xs font-medium text-[#5a6a82] hover:text-[#0f1d33] transition-colors"
            >
              Change Phone Number
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

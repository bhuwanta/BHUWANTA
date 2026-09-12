'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | null;
  }
}

export function ContactForm({ projectsList = [], locationNames = [], initialProject }: { projectsList?: { name: string, location: string }[], locationNames?: string[], initialProject?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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
    const container = document.getElementById('recaptcha-container')
    if (container) container.innerHTML = ''
  }
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  // Only preselect if it's a real project name — otherwise the <select> would
  // silently show a blank state since no <option> would match the value.
  const matchedProject = initialProject && projectsList.some(p => p.name === initialProject) ? initialProject : 'Not Sure'
  const matchedLocation = initialProject ? projectsList.find(p => p.name === initialProject)?.location : undefined

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: matchedLocation || 'All',
    project: matchedProject,
    enquiryType: 'Site Visit',
    message: '',
    referredBy: '',
    agree: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    let finalValue = value
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '')
      if (value !== digitsOnly || digitsOnly.length > 10) {
        setPhoneError('Please enter 10 digits only')
      } else {
        setPhoneError('')
      }
      finalValue = digitsOnly.slice(0, 10)
    }

    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : finalValue
      }
      if (name === 'location') {
        newData.project = 'Not Sure'
      }
      return newData
    })
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.agree) {
      setError('You must agree to the Terms & Conditions.')
      return
    }
    if (formData.phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit number')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        })
      }

      const formattedPhone = `+91${formData.phone}`
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaRef.current)
      setConfirmationResult(confirmation)
      setStep(2)
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; message?: string }
      console.error('Firebase OTP Error:', {
        code: firebaseErr.code,
        message: firebaseErr.message,
        fullError: err,
      })
      setError(firebaseErr.message || 'Failed to send OTP. Please try again.')
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
      // 1. Verify OTP with Firebase
      await confirmationResult.confirm(otp)

      // 2. If successful, save lead to database
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone,
          location: formData.location,
          project: formData.project,
          enquiryType: formData.enquiryType,
          message: formData.message,
          referredBy: formData.referredBy,
          sourcePage: 'Website - Home - Contact Section',
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message.')
      }

      clearRecaptcha()

      router.push('/thank-you')
    } catch (err: unknown) {
      console.error(err)
      setError('Invalid OTP or error submitting form. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <h3 className="text-2xl font-bold text-[#0f1d33] mb-2">Send Us a Message</h3>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium mb-6">
          {error}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleSendOTP} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#0f1d33] mb-1">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#0f1d33] mb-1">Mobile Number <span className="text-red-500">*</span></label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                minLength={10}
                pattern="[0-9]{10}"
                className={`w-full bg-[#f3f5f8] border ${phoneError ? 'border-red-500 focus:ring-red-500' : 'border-[#e8ecf2] focus:ring-[#c4a55a]'} rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:border-transparent`}
              />
              {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-[#0f1d33] mb-1">Preferred Location</label>
              <div className="relative">
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full appearance-none bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-3 pr-10 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent"
                >
                  <option value="All">All Locations</option>
                  {locationNames.map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#5a6a82]">
                  <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="project" className="block text-sm font-medium text-[#0f1d33] mb-1">Project Interested In</label>
              <div className="relative">
                <select
                  id="project"
                  name="project"
                  value={formData.project}
                  onChange={handleChange}
                  className="w-full appearance-none bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-3 pr-10 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent"
                >
                  <option value="Not Sure">Not Sure</option>
                  {Array.from(new Set(
                    projectsList
                      .filter(p => (formData.location && formData.location !== 'All') ? p.location === formData.location : true)
                      .map(p => p.name)
                  )).map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#5a6a82]">
                  <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#0f1d33] mb-1">Email ID</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="referredBy" className="block text-sm font-medium text-[#0f1d33] mb-1">Referred By (Optional)</label>
              <input
                type="text"
                id="referredBy"
                name="referredBy"
                value={formData.referredBy}
                onChange={handleChange}
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="enquiryType" className="block text-sm font-medium text-[#0f1d33] mb-1">Select Enquiry Type</label>
              <div className="relative">
                <select
                  id="enquiryType"
                  name="enquiryType"
                  value={formData.enquiryType}
                  onChange={handleChange}
                  className="w-full appearance-none bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-3 pr-10 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent"
                >
                  <option value="Site Visit">Site Visit</option>
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Pricing Details">Pricing Details</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#5a6a82]">
                  <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="message" className="block text-sm font-medium text-[#0f1d33] mb-1">Your Message</label>
              <textarea
                id="message"
                name="message"
                rows={2}
                value={formData.message}
                onChange={handleChange}
                required
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent resize-none"
              ></textarea>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="agree"
              name="agree"
              checked={formData.agree}
              onChange={handleChange}
              required
              className="w-4 h-4 rounded border-[#e8ecf2] text-[#1e3a5f] focus:ring-[#c4a55a]"
            />
            <label htmlFor="agree" className="text-xs text-[#5a6a82] leading-tight">
              By submitting, I agree to the Terms & Conditions and Privacy Policy.
            </label>
          </div>

          <div id="recaptcha-container"></div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#c4a55a] to-[#d4b872] text-white font-semibold rounded-lg shadow-lg shadow-[#c4a55a]/20 py-3 px-4 flex justify-center items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending OTP...' : 'Request Investor Pricing →'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-5 bg-[#f8f9fb] p-6 rounded-xl border border-[#e8ecf2]">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-[#0f1d33] mb-1">Verify Phone Number</h4>
            <p className="text-sm text-[#5a6a82] mb-4">We sent a 6-digit code to +91 {formData.phone}</p>
          </div>

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-[#0f1d33] mb-1 text-center">Enter OTP</label>
            <input
              type="text"
              id="otp"
              name="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              placeholder="000000"
              className="w-full text-center tracking-widest text-xl bg-white border border-[#e8ecf2] rounded-lg px-3 py-3 text-[#0f1d33] focus:outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={loading}
              className="w-1/3 bg-white border border-[#e8ecf2] text-[#5a6a82] font-semibold rounded-lg py-3 px-4 hover:bg-gray-50 transition-colors disabled:opacity-70"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-2/3 bg-gradient-to-r from-[#c4a55a] to-[#d4b872] text-white font-semibold rounded-lg shadow-lg shadow-[#c4a55a]/20 py-3 px-4 flex justify-center items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Submit'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

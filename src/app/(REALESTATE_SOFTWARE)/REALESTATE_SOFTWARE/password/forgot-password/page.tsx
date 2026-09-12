'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import logoFallback from '@/images/logo.png'
import { sendRecoveryEmailAction } from './actions'
import { BackToWebsiteButton } from '@/components/ui/BackToWebsiteButton'

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    const res = await sendRecoveryEmailAction(email.trim())
    
    if (res.success) {
      setSuccess(true)
    } else {
      setError(res.error || 'Failed to send recovery email')
    }
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center p-4">
      <BackToWebsiteButton />

      <div className="w-full max-w-md bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-8">
        
        <div className="flex justify-center mb-6">
          <Image 
            src={logoFallback} 
            alt="Bhuwanta Logo" 
            width={150} 
            height={50} 
            className="h-12 w-auto object-contain"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#0f1d33] mb-2">
            Forgot Password
          </h1>
          <p className="text-[#5a6a82] text-sm">
            Enter your email to receive a password reset link
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-lg font-semibold text-[#0f1d33] mb-2">Check your email</h2>
            <p className="text-[#5a6a82] text-sm mb-6">
              If an account exists for <span className="font-medium text-[#0f1d33]">{email}</span>, you will receive a secure link to reset your password.
            </p>
            <a 
              href="/REALESTATE_SOFTWARE/login"
              className="w-full inline-flex justify-center items-center gap-2 text-sm gradient-gold text-white font-semibold rounded-lg py-2.5 shadow-lg shadow-[#c4a55a]/20 hover:scale-[1.02] transition-transform"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </a>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#0f1d33] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                placeholder="e.g. user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-gold text-white font-semibold rounded-lg py-2.5 shadow-lg shadow-[#c4a55a]/20 hover:scale-[1.02] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center mt-6">
              <a 
                href="/REALESTATE_SOFTWARE/login"
                className="inline-flex items-center gap-2 text-sm text-[#5a6a82] hover:text-[#0f1d33] font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

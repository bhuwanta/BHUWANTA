'use client'

import { useState, startTransition } from 'react'
import { Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { BrandLockup } from '@/components/layout/BrandLockup'
import { login, resetPassword } from './actions'
import { BackToWebsiteButton } from '@/components/ui/BackToWebsiteButton'

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  async function handleLoginSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  async function handleResetSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    const result = await resetPassword(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setResetSuccess(true)
    }
    setIsPending(false)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa] px-4 pt-28 pb-16">
      <BackToWebsiteButton />

      <div className="w-full max-w-md bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-8">

        <div className="flex justify-center mb-6">
          <BrandLockup priority />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#0f1d33] mb-2">
            {isForgotPassword ? 'Reset Password' : 'CRM Login'}
          </h1>
          <p className="text-[#5a6a82] text-sm">
            {isForgotPassword 
              ? 'Enter your email to receive a password reset link.' 
              : 'Enter your Email and Password to login'}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {resetSuccess && isForgotPassword ? (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg text-sm flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <p>If an account exists for that email, we have sent password reset instructions.</p>
            <button 
              onClick={() => {
                setIsForgotPassword(false)
                setResetSuccess(false)
                setError(null)
              }}
              className="mt-2 text-[#c4a55a] font-medium hover:underline"
            >
              Back to Login
            </button>
          </div>
        ) : isForgotPassword ? (
          <form onSubmit={(e) => { e.preventDefault(); handleResetSubmit(new FormData(e.currentTarget)); }} className="space-y-5">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-[#0f1d33] mb-1.5">
                Email Address
              </label>
              <input
                name="email"
                type="email"
                id="reset-email"
                required
                placeholder="e.g. admin@bhuwanta.com"
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full gradient-gold text-white font-semibold rounded-lg py-2.5 shadow-lg shadow-[#c4a55a]/20 hover:scale-[1.02] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'Sending Link...' : 'Send Reset Link'}
            </button>
            
            <button 
              type="button"
              disabled={isPending}
              onClick={() => {
                setIsForgotPassword(false)
                setError(null)
              }}
              className="w-full flex items-center justify-center gap-2 text-sm text-[#5a6a82] hover:text-[#c4a55a] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleLoginSubmit(new FormData(e.currentTarget)); }} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#0f1d33] mb-1.5">
                Email Address
              </label>
              <input
                name="email"
                type="email"
                id="email"
                required
                placeholder="e.g. admin@bhuwanta.com"
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-[#0f1d33]">
                  Password
                </label>
                <button 
                  type="button"
                  tabIndex={-1}
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-[#c4a55a] hover:text-[#a38848] font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  id="password"
                  required
                  placeholder="Enter your password"
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 pr-10 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6a82] hover:text-[#0f1d33]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full gradient-gold text-white font-semibold rounded-lg py-2.5 shadow-lg shadow-[#c4a55a]/20 hover:scale-[1.02] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

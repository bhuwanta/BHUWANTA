'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { BrandLockup } from '@/components/layout/BrandLockup'
import { updatePassword } from './actions'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    // Initialize the browser client so it parses the #access_token=... URL fragment
    // provided by Supabase's email link and sets the cookie.
    createClient()
  }, [])

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    const result = await updatePassword(formData)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLengthValid = password.length >= 8 && password.length <= 20;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa] px-4 pt-28 pb-16">
      <div className="w-full max-w-md bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-8">
        <div className="flex justify-center mb-6">
          <BrandLockup priority />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#0f1d33] mb-2">
            Create New Password
          </h1>
          <p className="text-[#5a6a82] text-sm">
            Enter a new password for your CRM account.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form action={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#0f1d33] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                id="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
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
            
            {/* Password Requirements Guide */}
            <div className="mt-3 space-y-1.5 bg-[#f7f8fa] p-3 rounded-lg border border-[#e8ecf2]">
              <p className="text-xs font-semibold text-[#0f1d33] mb-2">Password Requirements:</p>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`w-3.5 h-3.5 ${isLengthValid ? 'text-emerald-500' : 'text-[#5a6a82]/40'}`} />
                <span className={isLengthValid ? 'text-emerald-700' : 'text-[#5a6a82]'}>8-20 characters long</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasUpperCase ? 'text-emerald-500' : 'text-[#5a6a82]/40'}`} />
                <span className={hasUpperCase ? 'text-emerald-700' : 'text-[#5a6a82]'}>At least one uppercase letter</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-500' : 'text-[#5a6a82]/40'}`} />
                <span className={hasNumber ? 'text-emerald-700' : 'text-[#5a6a82]'}>At least one number</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasSpecialChar ? 'text-emerald-500' : 'text-[#5a6a82]/40'}`} />
                <span className={hasSpecialChar ? 'text-emerald-700' : 'text-[#5a6a82]'}>At least one special character</span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#0f1d33] mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 pr-10 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6a82] hover:text-[#0f1d33]"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !isLengthValid || !hasUpperCase || !hasNumber || !hasSpecialChar || password !== confirmPassword}
            className="w-full gradient-gold text-white font-semibold rounded-lg py-2.5 shadow-lg shadow-[#c4a55a]/20 hover:scale-[1.02] transition-transform disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

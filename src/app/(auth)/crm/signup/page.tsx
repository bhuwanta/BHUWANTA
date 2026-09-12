'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { signup } from './actions'
import { BackToWebsiteButton } from '@/components/ui/BackToWebsiteButton'

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa]">
      <BackToWebsiteButton />

      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-sm border border-[#e8ecf2]">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-[#0f1d33]">
            Create Admin Account
          </h2>
          <p className="mt-2 text-sm text-[#5a6a82]">
            Sign up to access the Bhuwanta CRM
          </p>
        </div>
        
        <form action={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0f1d33] mb-1">
                Full Name
              </label>
              <input
                name="name"
                type="text"
                required
                placeholder="John Doe"
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f1d33] mb-1">
                Phone Number
              </label>
              <input
                name="phone"
                type="tel"
                required
                pattern="[0-9]{10}"
                minLength={10}
                maxLength={10}
                title="Please enter exactly 10 digits"
                placeholder="9876543210"
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f1d33] mb-1">
                Email Address
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="admin@bhuwanta.com"
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f1d33] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 pr-10 text-[#0f1d33] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#5a6a82] hover:text-[#0f1d33]"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              disabled={isPending}
              className="flex w-full justify-center items-center h-12 gradient-gold text-white font-semibold rounded-lg shadow-lg shadow-[#c4a55a]/20 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
          
          <div className="text-center mt-4 text-sm text-[#5a6a82]">
            Already have an account? <Link href="/crm/login" className="text-[#1e3a5f] hover:underline font-medium">Log in</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

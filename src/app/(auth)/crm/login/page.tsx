'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import logoFallback from '@/images/logo.png'
import { login } from './actions'
import { BackToWebsiteButton } from '@/components/ui/BackToWebsiteButton'

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa] px-4 pt-28 pb-16">
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
            CRM Login
          </h1>
          <p className="text-[#5a6a82] text-sm">
            Enter your Email and Password to login
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
            <label htmlFor="password" className="block text-sm font-medium text-[#0f1d33] mb-1.5">
              Password
            </label>
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
      </div>
    </div>
  )
}

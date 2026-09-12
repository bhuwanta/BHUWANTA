'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { BackToWebsiteButton } from '@/components/ui/BackToWebsiteButton'
import logoFallback from '@/images/logo.png'
import { loginAction } from './actions'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    const res = await loginAction(email.trim(), password)

    if (res.success && res.redirectPath) {
      // Full navigation, not router.push(). The just-set session cookie
      // (from loginAction's signInWithPassword) needs to be re-sent by
      // the browser on the very next request — a client-side RSC
      // transition via router.push can race that and hand the
      // destination server component a still-stale/no session, bouncing
      // it straight back to login via requireRole(). A hard navigation
      // guarantees the fresh cookie is present.
      window.location.href = res.redirectPath
    } else {
      setError(res.error || 'Failed to login')
      setLoading(false)
    }
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
            Login
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

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#0f1d33] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              placeholder="e.g. admin@bhuwanta.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-[#0f1d33]">
                Password
              </label>
              <a href="/REALESTATE_SOFTWARE/password/forgot-password" className="text-sm text-[#c4a55a] hover:text-[#a38744] font-medium transition-colors">
                Forgot Password?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
            disabled={loading}
            className="w-full gradient-gold text-white font-semibold rounded-lg py-2.5 shadow-lg shadow-[#c4a55a]/20 hover:scale-[1.02] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import logoFallback from '@/images/logo.png'
import { createClient } from '@/lib/supabase/client'
import { BackToWebsiteButton } from '@/components/ui/BackToWebsiteButton'

export default function SetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [verifyingSession, setVerifyingSession] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // Check if we have a session (the magic link/recovery link logs them in)
    const checkSession = async () => {
      // Handle PKCE flow if 'code' is present in URL
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setError('Invalid or expired reset link. Please request a new one.')
          setVerifyingSession(false)
          return
        }
        // Remove code from URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }

      // Handle Implicit Flow if 'access_token' is in hash
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            setError('Invalid or expired reset link. Please request a new one.')
            setVerifyingSession(false)
            return
          }
          // Clear hash from URL
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      
      // Sometimes it takes a moment for the hash/code to be parsed by the client
      if (!session) {
        // Wait a short moment and check again
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (!retrySession) {
            setError('Invalid or expired reset link. Please request a new one.')
          }
          setVerifyingSession(false)
        }, 1500)
      } else {
        setVerifyingSession(false)
      }
    }

    // Also listen for auth state changes which might fire when the link is parsed
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setVerifyingSession(false)
        setError(null)
      }
    })

    checkSession()

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLengthValid = password.length >= 8 && password.length <= 20;

    if (!isLengthValid || !hasUpperCase || !hasNumber || !hasSpecialChar) {
      setError('Password does not meet all security requirements')
      return
    }

    setLoading(true)
    
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      setError(updateError.message || 'Failed to update password')
      setLoading(false)
    } else {
      // Sign out so they can log back in freshly with their new credentials
      await supabase.auth.signOut()
      setSuccess(true)
      setLoading(false)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/REALESTATE_SOFTWARE/login')
      }, 3000)
    }
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLengthValid = password.length >= 8 && password.length <= 20;

  if (verifyingSession) {
    return (
      <div className="relative flex min-h-[80vh] flex-col items-center justify-center p-4">
      <BackToWebsiteButton />

        <Loader2 className="w-8 h-8 animate-spin text-[#c4a55a]" />
        <p className="mt-4 text-[#5a6a82] text-sm">Verifying secure link...</p>
      </div>
    )
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

        {success ? (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-[#0f1d33] mb-2">Password Set Successfully!</h2>
            <p className="text-[#5a6a82] text-sm mb-6">
              You will be redirected to the login page momentarily.
            </p>
            <Loader2 className="w-5 h-5 animate-spin text-[#c4a55a] mx-auto" />
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#0f1d33] mb-2">
                Set New Password
              </h1>
              <p className="text-[#5a6a82] text-sm">
                Please enter a secure password for your account.
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {!error || error.includes('match') || error.includes('characters') ? (
              <form onSubmit={handleSetPassword} className="space-y-5">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[#0f1d33] mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
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
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="confirmPassword"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
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
                  {loading ? 'Updating...' : 'Set Password'}
                </button>
              </form>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

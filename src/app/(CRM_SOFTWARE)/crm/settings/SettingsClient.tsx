'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Key, Eye, EyeOff } from 'lucide-react'

export default function SettingsClient() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const supabase = createClient()

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setIsSubmitting(true)
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    setIsSubmitting(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0f1d33]">Settings</h1>
        <p className="mt-2 text-sm text-[#5a6a82]">
          Manage your account settings and preferences.
        </p>
      </div>
      
      <div className="rounded-xl border border-[#e8ecf2] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#e8ecf2] px-6 py-5">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-[#c4a55a]" />
            <h2 className="text-lg font-medium text-[#0f1d33]">Change Password</h2>
          </div>
          <p className="mt-1 text-sm text-[#5a6a82]">Update the password used to log in to your account.</p>
        </div>
        
        <div className="px-6 py-6">
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {message && (
              <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {message.text}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-[#0f1d33] mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-[#e8ecf2] px-3 py-2 pr-10 text-sm focus:border-[#c4a55a] focus:outline-none focus:ring-1 focus:ring-[#c4a55a]"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#5a6a82] hover:text-[#0f1d33]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#0f1d33] mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-[#e8ecf2] px-3 py-2 pr-10 text-sm focus:border-[#c4a55a] focus:outline-none focus:ring-1 focus:ring-[#c4a55a]"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#5a6a82] hover:text-[#0f1d33]"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !newPassword || !confirmPassword}
                className="inline-flex items-center justify-center rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#0f1d33] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe')
      }

      toast.success(data.message || 'Successfully subscribed to the newsletter!')
      setEmail('')
    } catch (error: unknown) {
      toast.error((error instanceof Error ? error.message : null) || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-brand-border shadow-sm rounded-xl p-8 sm:p-12 text-center">
      <h2 className="text-2xl sm:text-3xl font-bold text-brand-ink mb-4">
        Subscribe to Our <span className="text-brand-accent">Newsletter</span>
      </h2>
      <p className="text-brand-muted text-sm sm:text-base mb-8 max-w-2xl mx-auto">
        Get the latest real estate updates, investment tips, and project launches directly in your inbox.
      </p>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row max-w-lg mx-auto gap-3">
        <input 
          type="email" 
          placeholder="Your Email Address" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="flex-1 bg-brand-soft border border-brand-border rounded-lg px-4 py-3 text-brand-ink text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors placeholder-brand-muted disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="gradient-gold text-white font-semibold rounded-lg px-6 py-3 shadow-lg shadow-brand-gold/20 hover:scale-105 transition-premium text-sm whitespace-nowrap flex items-center justify-center min-w-[120px] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Subscribe'
          )}
        </button>
      </form>
    </div>
  )
}

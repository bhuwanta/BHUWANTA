'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  ArrowLeft,
  Phone,
  MessageCircle,
  Mail,
  PhoneCall,
  CalendarCheck,
  FileCheck2,
  Building2,
  Star,
  Images,
  BookOpen,
} from 'lucide-react'
import { fireLeadConversion } from '@/lib/gtag'

const WHATSAPP_NUMBER = '919666504405'
const CALL_NUMBER = '+919666504405'
const EMAIL = 'info@bhuwanta.com'

/**
 * Works out what to honestly promise, in IST, rather than always claiming a
 * call "within 2 hours" — a form filled at 11pm on Saturday would otherwise
 * set an expectation the team cannot meet. Business hours: Mon–Sat, 10–7.
 */
function getResponseMessage(now: Date): string {
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const day = ist.getDay() // 0 = Sunday
  const hour = ist.getHours()

  const isSunday = day === 0
  const withinHours = !isSunday && hour >= 10 && hour < 19

  if (withinHours) return 'Our team will call you within 2 hours.'
  if (isSunday) return 'Our team will call you on Monday morning, as soon as we open at 10 AM.'
  if (hour < 10) return 'Our team will call you this morning, as soon as we open at 10 AM.'
  return day === 6
    ? 'Our team will call you on Monday morning, as soon as we open at 10 AM.'
    : 'Our team will call you tomorrow morning, as soon as we open at 10 AM.'
}

const NEXT_STEPS = [
  {
    icon: PhoneCall,
    title: 'We call you',
    body: 'A Bhuwanta advisor calls to understand what you are looking for — budget, location and timeline.',
  },
  {
    icon: CalendarCheck,
    title: 'We show you the land',
    body: 'We arrange a site visit at a time that suits you, with pickup available from anywhere in Hyderabad.',
  },
  {
    icon: FileCheck2,
    title: 'You verify everything',
    body: 'Approvals, RERA registration and title documents — reviewed openly before any commitment.',
  },
]

const WHILE_YOU_WAIT = [
  { href: '/projects', icon: Building2, label: 'Our Projects', desc: 'HMDA & DTCP approved layouts' },
  { href: '/reviews', icon: Star, label: 'Customer Reviews', desc: 'Hear from our buyers' },
  { href: '/gallery', icon: Images, label: 'Gallery', desc: 'Photos and site visits' },
  { href: '/blog', icon: BookOpen, label: 'Buyer Guides', desc: 'Know before you buy' },
]

export default function ThankYouPage() {
  const router = useRouter()
  const waMessage = encodeURIComponent(
    'Hi Bhuwanta, I just submitted an enquiry on your website — could we speak sooner on WhatsApp?'
  )
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`

  // Rendered only after mount: the message depends on the visitor's clock, and
  // computing it during render would mismatch the server's HTML.
  const [responseMessage, setResponseMessage] = useState<string | null>(null)

  useEffect(() => {
    // Reaching this page only happens after a successful form submission
    // (ContactForm redirects here) — fires the shared lead conversion once.
    fireLeadConversion()
    // Deferred out of the effect body so the state write doesn't cascade a
    // second render synchronously.
    queueMicrotask(() => setResponseMessage(getResponseMessage(new Date())))
  }, [])

  const handleBack = () => {
    // Landing here directly (a bookmark, a shared link) leaves nothing to go
    // back to, so fall back to the homepage rather than dead-ending.
    if (window.history.length > 1) router.back()
    else router.push('/')
  }

  return (
    <main className="min-h-[80vh] bg-[#f7f8fa] pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#c4a55a] hover:text-[#b59853] transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Confirmation */}
        <div className="bg-white border border-[#e8ecf2] rounded-2xl shadow-sm p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-[#c4a55a] mb-3">Enquiry Received</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0f1d33] mb-4">
            Thank You — We&apos;ll Be In Touch
          </h1>

          <p className="text-[#5a6a82] leading-relaxed max-w-xl mx-auto">
            {/* Reserve the line height before the clock-dependent text arrives. */}
            {responseMessage || ' '}
          </p>
          <p className="text-sm text-[#5a6a82]/80 mt-2">Business hours: Mon–Sat, 10 AM – 7 PM IST</p>

          <div className="mt-8 pt-8 border-t border-[#e8ecf2]">
            <p className="text-sm font-semibold text-[#0f1d33] mb-4">Would you rather not wait?</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] text-white font-semibold rounded-lg shadow-lg shadow-[#25D366]/20 hover:scale-105 transition-premium"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp Us Now
              </a>
              <a
                href={`tel:${CALL_NUMBER}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 gradient-gold text-white font-semibold rounded-lg shadow-lg shadow-[#c4a55a]/20 hover:scale-105 transition-premium"
              >
                <Phone className="w-4 h-4" /> Call Us
              </a>
              <a
                href={`mailto:${EMAIL}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-[#e8ecf2] text-[#1e3a5f] font-semibold rounded-lg hover:border-[#c4a55a] transition-premium"
              >
                <Mail className="w-4 h-4" /> Email
              </a>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-[#0f1d33] text-center mb-6">What Happens Next</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {NEXT_STEPS.map((step, i) => (
              <div key={step.title} className="bg-white border border-[#e8ecf2] rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#c4a55a]/10 flex items-center justify-center shrink-0">
                    <step.icon className="w-4.5 h-4.5 text-[#c4a55a]" />
                  </div>
                  <span className="text-xs font-bold text-[#c4a55a]">STEP {i + 1}</span>
                </div>
                <h3 className="font-bold text-[#0f1d33] mb-1.5">{step.title}</h3>
                <p className="text-sm text-[#5a6a82] leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* While you wait */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-[#0f1d33] text-center mb-6">While You Wait</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {WHILE_YOU_WAIT.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group bg-white border border-[#e8ecf2] rounded-xl p-5 shadow-sm hover:border-[#c4a55a] hover:shadow-md transition-premium flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-lg bg-[#f3f5f8] flex items-center justify-center shrink-0 group-hover:bg-[#c4a55a]/10 transition-colors">
                  <link.icon className="w-5 h-5 text-[#c4a55a]" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[#0f1d33] group-hover:text-[#c4a55a] transition-colors truncate">
                    {link.label}
                  </p>
                  <p className="text-sm text-[#5a6a82] truncate">{link.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-[#5a6a82]/70 mt-10">
          Your details are kept confidential and are never shared with third parties.
        </p>
      </div>
    </main>
  )
}

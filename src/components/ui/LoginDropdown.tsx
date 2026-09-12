'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

// The site has two separate sign-ins, so Login opens a choice rather than
// guessing which one the visitor wants.
const PORTALS = [
  { href: '/crm/login', name: 'CRM' },
  { href: '/REALESTATE_SOFTWARE/login', name: 'BDCP' },
]

export function LoginDropdown({
  variant = 'desktop',
  className = '',
  onNavigate,
}: {
  /**
   * 'desktop' floats a panel under the button. 'mobile' expands in place
   * inside the menu drawer, where a floating panel would sit over the links
   * behind it and be awkward to tap.
   */
  variant?: 'desktop' | 'mobile'
  className?: string
  /** Lets the mobile menu close itself once a portal is chosen. */
  onNavigate?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    // touchstart as well as mousedown so a tap outside closes it on phones.
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const isMobile = variant === 'mobile'

  return (
    <div ref={containerRef} className={isMobile ? 'relative mt-3' : 'relative hidden sm:block'}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`${className} cursor-pointer`}
      >
        Login
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={
            isMobile
              ? 'mt-2 w-full rounded-lg border border-[#e8ecf2] bg-white shadow-sm overflow-hidden'
              // min-w-full pins it to the trigger's own width so it sits flush
              // under the Login button instead of a fixed width that overhangs
              // leftward across the button beside it.
              : 'absolute right-0 top-full mt-2 min-w-full w-max rounded-xl border border-[#e8ecf2] bg-white shadow-lg overflow-hidden z-50'
          }
        >
          {PORTALS.map((portal) => (
            <Link
              key={portal.href}
              href={portal.href}
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
                onNavigate?.()
              }}
              // min-h-12 keeps every row a comfortable tap target on phones.
              className="flex items-center justify-center min-h-12 px-4 text-sm font-bold text-[#0f1d33] hover:bg-[#f7f8fa] hover:text-[#c4a55a] transition-colors border-b border-[#e8ecf2] last:border-b-0"
            >
              {portal.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

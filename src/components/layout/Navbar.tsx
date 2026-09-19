'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandLockup } from './BrandLockup'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/why-bhuwanta', label: 'Why Bhuwanta' },
  { href: '/projects', label: 'Projects' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/blog', label: 'Blog' },
]

export function Navbar() {
  const pathname = usePathname()
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const isOpen = menuPath === pathname
  const ctaText = 'Free Site Visit'
  const ctaLink = pathname === '/shabad-open-plots' ? '#book-visit' : '/#book-visit'

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!window.location.hash) window.scrollTo(0, 0)
    }, 50)
    return () => clearTimeout(timeout)
  }, [pathname])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuPath(null)
        document.getElementById('nav-mobile-toggle')?.focus()
      }
    }
    if (isOpen) document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])


  const active = (href: string) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav aria-label="Main navigation" className="public-nav fixed inset-x-0 top-0 z-50 border-b border-brand-gold/20 bg-brand-deep/95 backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-20">
          <Link href="/" id="nav-logo" aria-label="Bhuwanta home" onClick={() => setMenuPath(null)} className="shrink-0 rounded-sm">
            <BrandLockup priority />
          </Link>
          <div className="hidden xl:flex items-center gap-0.5">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} id={`nav-${link.label.toLowerCase().replaceAll(' ', '-')}`}
                aria-current={active(link.href) ? 'page' : undefined}
                className={cn('px-3 py-2 text-sm font-medium rounded-md transition-colors border', active(link.href) ? 'border-brand-gold text-brand-gold bg-transparent' : 'border-transparent text-white/85 hover:text-brand-gold hover:bg-white/5')}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href={ctaLink} id="nav-cta" className="hidden sm:inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold border border-brand-gold bg-transparent text-brand-gold hover:bg-brand-gold hover:text-white transition-colors whitespace-nowrap">
              {ctaText}
            </Link>
            <Link href="/REALESTATE_SOFTWARE/login" id="nav-login" className="nav-login-button hidden sm:inline-flex px-4 py-3 rounded-lg text-sm font-semibold transition-colors">Login</Link>
            <button id="nav-mobile-toggle" type="button" aria-label={isOpen ? 'Close menu' : 'Open menu'} aria-expanded={isOpen} aria-controls="public-mobile-menu"
              className="xl:hidden inline-flex items-center justify-center w-11 h-11 text-brand-gold rounded-lg border border-white/20 hover:bg-white/10"
              onClick={() => setMenuPath(isOpen ? null : pathname)}>
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div id="public-mobile-menu" className="xl:hidden max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-white/10 bg-brand-deep px-4 py-4">
          <div className="max-w-7xl mx-auto grid gap-1">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} aria-current={active(link.href) ? 'page' : undefined} onClick={() => setMenuPath(null)}
                className={cn('block px-4 py-3 rounded-lg text-sm font-medium border', active(link.href) ? 'border-brand-gold text-brand-gold bg-transparent' : 'border-transparent text-white/85 hover:bg-white/5 hover:text-brand-gold')}>
                {link.label}
              </Link>
            ))}
            <Link href={ctaLink} onClick={() => setMenuPath(null)} className="mt-3 px-4 py-3 text-center font-semibold text-sm rounded-lg border border-brand-gold bg-transparent text-brand-gold hover:bg-brand-gold hover:text-white">{ctaText}</Link>
            <Link href="/REALESTATE_SOFTWARE/login" id="nav-mobile-login" onClick={() => setMenuPath(null)} className="nav-login-button px-4 py-3 text-center text-sm font-semibold rounded-lg">Login</Link>
          </div>
        </div>
      )}
    </nav>
  )
}

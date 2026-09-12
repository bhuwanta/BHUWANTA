'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { client, urlFor } from '@/lib/sanity'
import logoFallback from '@/images/logo.png'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/why-bhuwanta', label: 'Why Bhuwanta' },
  { href: '/projects', label: 'Projects' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/blog', label: 'Blog' },
]

interface SiteSettings {
  siteName?: string
  tagline?: string
  logo?: { asset?: { _ref: string } }
  ctaButtonText?: string
  ctaButtonLink?: string
}

export function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [settings, setSettings] = useState<SiteSettings>({})

  const isHome = pathname === '/'
  const showGlass = scrolled
  const isDarkContent = showGlass || !isHome

  // Always scroll to top on route change, unless there is a hash
  useEffect(() => {
    setTimeout(() => {
      if (!window.location.hash) {
        window.scrollTo(0, 0)
      }
    }, 50)
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    // Check initial scroll position
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    client.fetch(`*[_type == "siteSettings"][0]{
      siteName, tagline, ctaButtonText, ctaButtonLink
    }`).then((data: SiteSettings) => {
      if (data) setSettings(data)
    }).catch(() => {})
  }, [])
  const siteName = settings.siteName || 'BHUWANTA'
  const ctaText = settings.ctaButtonText || 'Book Site Visit'
  const ctaLink = '/#book-visit' // Hardcoded to always scroll to the Schedule a Tour section

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        isDarkContent
          ? 'bg-white/80 backdrop-blur-xl border-b border-[#e8ecf2] shadow-sm py-4'
          : 'bg-transparent py-6'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link href="/" className="flex items-center" id="nav-logo">
            <div className="relative h-12 sm:h-16 w-auto transition-transform duration-500 hover:scale-[1.05] origin-left">
              <Image 
                src={logoFallback} 
                alt={siteName} 
                width={180}
                height={64}
                fetchPriority="high"
                className={cn(
                  "h-12 sm:h-16 w-auto object-contain transition-all duration-500",
                  !isDarkContent && "drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]",
                  isDarkContent && "brightness-0"
                )}
                style={{ width: 'auto', height: 'auto' }}
                sizes="(max-width: 640px) 180px, 250px"
                priority
              />
            </div>
          </Link>

          {/* Right Section: Nav + CTA */}
          <div className="flex items-center gap-8">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  id={`nav-${link.label.toLowerCase()}`}
                  onClick={() => {
                    if (!link.href.includes('#')) {
                      window.scrollTo(0, 0)
                    }
                  }}
                  className={cn(
                    "px-4 py-2 text-sm transition-premium rounded-lg",
                    isDarkContent 
                      ? "text-[#002935] font-bold hover:text-[#B69A4E] hover:bg-[#f3f5f8]" 
                      : "text-white/90 font-medium hover:text-white hover:bg-white/10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* CTA + Call Now + Mobile Toggle */}
            <div className="flex items-center gap-3">

              <Link
                href={ctaLink}
                id="nav-cta"
                onClick={(e) => {
                  if (isHome) {
                    e.preventDefault();
                    document.getElementById('book-visit')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="hidden sm:inline-flex px-5 py-2.5 text-sm font-semibold rounded-lg transition-premium hover:scale-105 glow-gold gradient-gold text-white"
              >
                {ctaText}
              </Link>

              <Link
                href="/login"
                id="nav-login"
                className="hidden sm:inline-flex px-5 py-2.5 text-sm font-semibold rounded-lg transition-premium hover:scale-105 glow-gold gradient-gold text-white"
              >
                Login
              </Link>

              {/* Mobile hamburger */}
              <button
                className={cn(
                  "md:hidden p-2 transition-colors",
                  isDarkContent ? "text-[#002935]" : "text-white"
                )}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
                id="nav-mobile-toggle"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          'md:hidden overflow-hidden transition-all duration-500',
          isOpen ? 'max-h-[600px] border-t border-[#e8ecf2] bg-white' : 'max-h-0'
        )}
      >
        <div className="px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => {
                setIsOpen(false)
                if (!link.href.includes('#')) {
                  window.scrollTo(0, 0)
                }
              }}
              className="block px-4 py-3 text-sm font-semibold text-[#0f1d33] hover:text-[#002935] hover:bg-[#f3f5f8] rounded-lg transition-premium"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={ctaLink}
            onClick={(e) => {
              setIsOpen(false);
              if (isHome) {
                e.preventDefault();
                document.getElementById('book-visit')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="block px-4 py-3 text-sm font-semibold text-center rounded-lg gradient-gold text-white mt-3"
          >
            {ctaText}
          </Link>

          <Link
            href="/login"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 text-sm font-semibold text-center rounded-lg gradient-gold text-white mt-3"
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  )
}
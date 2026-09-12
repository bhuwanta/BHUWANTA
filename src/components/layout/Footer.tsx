'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Mail, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { client, urlFor } from '@/lib/sanity'
import logoFallback from '@/images/logo.png'

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>
  </svg>
)

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
)

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
)

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a1.9 1.9 0 0 0 1.32 1.35c1.7.47 8.22.47 8.22.47s6.52 0 8.22-.47a1.9 1.9 0 0 0 1.32-1.35c.46-1.69.46-5.58.46-5.58s0-3.89-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
  </svg>
)

const defaultFooterLinks = [
  { href: '/about', label: 'About Us' },
  { href: '/projects', label: 'Projects' },
  { href: '/why-bhuwanta', label: 'Why Bhuwanta' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/blog', label: 'Blog' },
]

interface FooterSettings {
  siteName?: string
  tagline?: string
  logo?: { asset?: { _ref: string } }
  navLinks?: { label: string; href: string }[]
  footerAddress?: string
  footerAddressLabel?: string
  googleMapsUrl?: string
  footerEmail?: string
  copyrightText?: string
  socialLinks?: {
    linkedin?: string
    facebook?: string
    instagram?: string
    youtube?: string
    twitter?: string
  }
}

export function Footer() {
  const [settings, setSettings] = useState<FooterSettings>({})

  useEffect(() => {
    client.fetch(`*[_type == "siteSettings"][0]{
      siteName, tagline, navLinks[]{ label, href },
      footerAddress, footerAddressLabel, googleMapsUrl,
      footerEmail, copyrightText, socialLinks
    }`).then((data: FooterSettings) => {
      if (data) setSettings(data)
    }).catch(() => {})
  }, [])

  const siteName = settings.siteName || 'BHUWANTA'
  const _tagline = settings.tagline || 'Land Today. Landmark Tomorrow.'

  const footerLinks = settings.navLinks?.length ? settings.navLinks : defaultFooterLinks
  const address = settings.footerAddress || 'Alluri Trade Center, Floor #5 , Unit #406 , KPHB, Near KPHB Metro Station (opposite to pillar number # 761), hyderabad, telangana - 500072'
  const addressLabel = settings.footerAddressLabel || 'Headquarters'
  const mapsUrl = settings.googleMapsUrl || 'https://maps.app.goo.gl/USjC2iYeGiXbZ5U16'
  const email = settings.footerEmail || 'info@bhuwanta.com'
  const copyright = settings.copyrightText || 'Bhuwanta. All rights reserved.'

  const socialItems = [
    { name: 'LinkedIn', icon: LinkedinIcon, url: settings.socialLinks?.linkedin || 'https://www.linkedin.com/in/bhuwanta-developer-043591405/' },
    { name: 'Facebook', icon: FacebookIcon, url: settings.socialLinks?.facebook || 'https://www.facebook.com/bhuwantadevelopers' },
    { name: 'Instagram', icon: InstagramIcon, url: settings.socialLinks?.instagram || 'https://www.instagram.com/bhuwantadevelopers/' },
    { name: 'YouTube', icon: YoutubeIcon, url: settings.socialLinks?.youtube || 'https://www.youtube.com/@BhuwantaDevelopers' },
  ].filter(s => s.url)

  return (
    <footer className="relative bg-[#002935] border-t border-white/10 pt-2">
      {/* Decorative top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#B69A4E]/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Brand Column */}
          <div className="lg:col-span-5">
            <div className="mb-8 sm:mb-10 flex flex-col items-start">
              <Link href="/" className="flex items-center group gap-3 sm:gap-4 mb-4">
                <div className="relative h-16 sm:h-20 w-auto transition-transform duration-500 hover:scale-[1.05] origin-left">
                  <div 
                    className="h-16 sm:h-20 w-48 sm:w-60"
                    style={{
                      WebkitMaskImage: `url(${logoFallback.src})`,
                      WebkitMaskSize: 'contain',
                      WebkitMaskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'left center',
                      backgroundColor: '#c4a55a' // Gold color
                    }}
                    aria-label={settings.siteName || 'BHUWANTA'}
                  />
                </div>
              </Link>
            </div>
            <div className="mb-6 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#B69A4E] mt-0.5 shrink-0" />
                <div className="text-sm text-white/70 leading-relaxed pr-2">
                  <strong className="block text-[#c4a55a] mb-1 text-base tracking-wide">{addressLabel}</strong>
                  <p>{address}</p>
                </div>
              </div>
              <a 
                href={mapsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-fit ml-8 px-4 py-2.5 text-xs font-bold rounded-lg bg-[#B69A4E]/10 text-[#B69A4E] hover:bg-[#B69A4E] hover:text-white transition-premium border border-[#B69A4E]/20 shadow-none flex items-center gap-2 uppercase tracking-wider"
              >
                <MapPin className="w-3.5 h-3.5" />
                Open in Google Maps
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2 lg:justify-self-center">
            <h3 className="text-sm font-semibold text-[#c4a55a] mb-4 uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-premium animated-underline inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="lg:col-span-3 lg:justify-self-center">
            <h3 className="text-sm font-semibold text-[#c4a55a] mb-4 uppercase tracking-wider">
              Contact
            </h3>
            <ul className="space-y-4">

              <li className="flex items-center gap-3 group">
                <Mail className="w-4 h-4 text-[#B69A4E] shrink-0" />
                <a href={`mailto:${email}`} className="text-sm text-white/70 group-hover:text-white transition-colors">{email}</a>
              </li>
            </ul>
          </div>

          {/* Follow Us Column */}
          <div className="lg:col-span-2 lg:justify-self-end">
            <h3 className="text-sm font-semibold text-[#c4a55a] mb-4 uppercase tracking-wider">
              Follow Us
            </h3>
            <div className="flex flex-col gap-3">
              {(socialItems.length > 0 ? socialItems : [
                { name: 'LinkedIn', icon: LinkedinIcon, url: '#' },
                { name: 'Facebook', icon: FacebookIcon, url: '#' },
                { name: 'Instagram', icon: InstagramIcon, url: '#' },
                { name: 'YouTube', icon: YoutubeIcon, url: '#' },
              ]).map((social) => (
                <a
                  key={social.name}
                  href={social.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm group transition-premium"
                  aria-label={social.name}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#B69A4E]/10 border border-[#B69A4E]/30 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/30 transition-premium">
                    <social.icon className="w-4 h-4 text-[#B69A4E] transition-all duration-300 group-hover:scale-110 group-hover:text-white" />
                  </div>
                  <span className="text-white/70 group-hover:text-white transition-colors">
                    {social.name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} {copyright}
          </p>
          <div className="flex gap-6 pr-4 md:pr-24 lg:pr-28 pb-20 md:pb-0">
            <Link href="/policies" className="text-xs text-white/50 hover:text-white transition-premium">
              Terms & Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
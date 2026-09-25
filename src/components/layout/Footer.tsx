import Link from 'next/link'
import { ArrowUpRight, CalendarDays, Mail } from 'lucide-react'
import { sanityFetch } from '@/lib/sanity'
import { BrandLockup } from './BrandLockup'
import { GoogleMapsIcon } from '@/components/ui/GoogleMapsIcon'
import { ProjectVisitLink } from '@/components/ui/ProjectVisitLink'

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a1.9 1.9 0 0 0 1.32 1.35c1.7.47 8.22.47 8.22.47s6.52 0 8.22-.47a1.9 1.9 0 0 0 1.32-1.35c.46-1.69.46-5.58.46-5.58s0-3.89-.46-5.58z" />
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
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

export async function Footer() {
  const settings =
    (await sanityFetch<FooterSettings | null>({
      query: `*[_type == "siteSettings"][0]{
      siteName, tagline, navLinks[]{ label, href }, footerAddress,
      footerAddressLabel, googleMapsUrl, footerEmail, copyrightText, socialLinks
    }`,
      tags: ['siteSettings'],
    }).catch(() => null)) || {}

  const footerLinks = settings.navLinks?.length
    ? settings.navLinks
    : defaultFooterLinks
  const address =
    settings.footerAddress ||
    'Alluri Trade Center, Floor 5, Unit 406, KPHB, near KPHB Metro Station (opposite pillar 761), Hyderabad, Telangana 500072'
  const addressLabel = settings.footerAddressLabel || 'Headquarters'
  const mapsUrl =
    settings.googleMapsUrl || 'https://maps.app.goo.gl/USjC2iYeGiXbZ5U16'
  const email = settings.footerEmail || 'info@bhuwanta.com'
  const copyright = settings.copyrightText || 'Bhuwanta. All rights reserved.'

  const socialItems = [
    {
      name: 'LinkedIn',
      icon: LinkedinIcon,
      url:
        settings.socialLinks?.linkedin ||
        'https://www.linkedin.com/in/bhuwanta-developer-043591405/',
    },
    {
      name: 'Facebook',
      icon: FacebookIcon,
      url:
        settings.socialLinks?.facebook ||
        'https://www.facebook.com/bhuwantadevelopers',
    },
    {
      name: 'Instagram',
      icon: InstagramIcon,
      url:
        settings.socialLinks?.instagram ||
        'https://www.instagram.com/bhuwanta_developers/',
    },
    {
      name: 'YouTube',
      icon: YoutubeIcon,
      url:
        settings.socialLinks?.youtube ||
        'https://www.youtube.com/@BhuwantaDevelopers',
    },
  ].filter((s) => s.url)

  const locations = [
    { label: 'Shabad', href: '/shabad-open-plots' },
    { label: 'Sangareddy', href: '/sangareddy-open-plots' },
    { label: 'Sadashivpet', href: '/sadashivpet-open-plots' },
    { label: 'Yadagirigutta', href: '/yadagirigutta-open-plots' },
    { label: 'Kothur', href: '/projects?category=bangalore-highway' },
  ]

  return (
    <footer className="public-footer">
      <div className="site-container">
        <div className="footer-main-grid">
          <div className="footer-brand-column">
            <Link
              href="/"
              aria-label="Bhuwanta home"
              className="footer-brand-logo"
            >
              <BrandLockup tagline />
            </Link>
            <h3 className="footer-hq-heading">{addressLabel}</h3>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-address-link"
            >
              <address>{address}</address>
            </a>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-inline-link"
            >
              <GoogleMapsIcon size={16} /> Google Maps
            </a>
          </div>

          <nav className="footer-link-column" aria-label="Footer navigation">
            <h3>Explore</h3>
            <ul>
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="footer-link-column" aria-label="Project locations">
            <h3>Our Locations</h3>
            <ul>
              {locations.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
            <Link href="/projects" className="footer-inline-link">
              All Projects <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </nav>

          <div className="footer-contact-column">
            <h3 className="footer-contact-heading">Contact Us</h3>
            <ul className="footer-contact-list">
              <li>
                <a href={`mailto:${email}`}>
                  <Mail size={16} aria-hidden="true" />
                  <span>{email}</span>
                </a>
              </li>
              <li>
                <ProjectVisitLink>
                  <CalendarDays size={16} aria-hidden="true" />
                  <span>Book a Free Site Visit</span>
                </ProjectVisitLink>
              </li>
            </ul>
            <h3 className="footer-socials-heading">Social Links</h3>
            <div className="footer-socials" aria-label="Follow Bhuwanta">
              {socialItems.map(({ name, url, icon: Icon }) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Bhuwanta on ${name}`}
                  title={name}
                >
                  <Icon width={17} height={17} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="footer-bottom-row">
          <p>
            © {new Date().getFullYear()} {copyright}
          </p>
          <div>
            <span>Hyderabad, Telangana</span>
            <Link href="/policies">Terms &amp; Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

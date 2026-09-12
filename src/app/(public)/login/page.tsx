import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'

export const metadata: Metadata = {
  title: 'Login | Bhuwanta',
  description: 'Sign in to the Bhuwanta CRM or BDCP.',
  // A staff entry point, not something for search results.
  robots: { index: false, follow: false },
}

// The site has two separate sign-ins, so the navbar's Login button lands here
// rather than guessing which one the visitor wants.
const PORTALS = [
  { href: '/crm/login', name: 'CRM' },
  { href: '/REALESTATE_SOFTWARE/login', name: 'BDCP' },
]

export default function LoginChooserPage() {
  return (
    <>
      <PageBanner title={<>Choose Your <span className="text-[#c4a55a]">Portal</span></>} />

      <div className="py-16 sm:py-24 bg-[#f7f8fa] min-h-[50vh]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {PORTALS.map((portal) => (
              <Link
                key={portal.href}
                href={portal.href}
                className="group bg-white border border-[#e8ecf2] rounded-2xl shadow-sm hover:border-[#c4a55a] hover:shadow-lg hover:-translate-y-1 transition-premium flex items-center justify-center gap-3 py-14"
              >
                <span className="text-2xl sm:text-3xl font-bold text-[#0f1d33] group-hover:text-[#c4a55a] transition-colors">
                  {portal.name}
                </span>
                <ArrowRight className="w-6 h-6 text-[#c4a55a] group-hover:translate-x-1.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

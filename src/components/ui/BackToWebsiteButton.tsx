import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * Sits in the top-left corner of the auth pages (staff login, CRM login and
 * signup, password reset), none of which have a header, so the corner is free.
 *
 * Always a plain link to the public site rather than history.back(): these
 * pages are reached from a bookmark, an emailed link, or by being bounced here
 * when a session expires — cases where "back" leads nowhere useful, or back to
 * the protected page that just rejected you.
 */
export function BackToWebsiteButton() {
  return (
    <Link
      href="/"
      className="absolute top-4 left-4 sm:top-6 sm:left-6 inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e8ecf2] text-[#1e3a5f] text-sm font-semibold rounded-lg shadow-sm hover:border-[#c4a55a] hover:text-[#c4a55a] hover:shadow-md transition-all"
    >
      <ArrowLeft className="w-4 h-4 text-[#c4a55a]" /> Back to Website
    </Link>
  )
}

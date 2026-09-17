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
      className="absolute top-6 left-4 sm:top-8 sm:left-6 inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-brand-border text-brand-primary text-sm font-semibold rounded-lg shadow-sm hover:border-brand-gold hover:text-brand-accent hover:shadow-md transition-all"
    >
      <ArrowLeft className="w-4 h-4 text-brand-accent" /> Back to Website
    </Link>
  )
}

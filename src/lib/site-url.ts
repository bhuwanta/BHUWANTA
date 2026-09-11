/**
 * The public base URL for anything that leaves the server — password-setup
 * links, emails, sitemap, canonical tags.
 *
 * Every call site used to be `process.env.NEXT_PUBLIC_SITE_URL || 'https://bhuwanta.com'`.
 * That fallback reads as safe but only fires when the variable is UNSET, and
 * the variable is set — to http://localhost:3000, which is correct for local
 * development and copied wholesale into hosting environments. The result was
 * password-setup emails pointing at localhost, openable by nobody.
 *
 * So this refuses localhost in production rather than trusting it: a
 * developer-machine URL in a production build is always a misconfiguration,
 * never an intention. Dev is untouched — localhost there is the whole point.
 */
const CANONICAL = 'https://bhuwanta.com'

function isLocal(url: string): boolean {
  return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0')
}

export function getSiteUrl(): string {
  // SITE_URL is preferred and NEXT_PUBLIC_SITE_URL is the legacy name.
  //
  // Every consumer of this value is server-side — emails, sitemap, robots,
  // canonical tags, metadataBase — so it never needs to reach the browser and
  // does not need the NEXT_PUBLIC_ prefix. Vercel flags that prefix because it
  // ships the value to the client; here that is simply unnecessary rather than
  // dangerous, since the value is the public domain either way.
  //
  // Both are read so the prefix can be dropped in hosting without a
  // coordinated deploy, and so an existing NEXT_PUBLIC_SITE_URL keeps working.
  const raw = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
  const configured = raw?.trim().replace(/\/+$/, '')

  if (process.env.NODE_ENV === 'production' && (!configured || isLocal(configured))) {
    // VERCEL_PROJECT_PRODUCTION_URL is injected by Vercel and is the real
    // deployment domain, so it stays correct even if the canonical domain
    // changes. Falls through to the canonical domain anywhere else.
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
    return vercel ? `https://${vercel.replace(/\/+$/, '')}` : CANONICAL
  }

  return configured || CANONICAL
}

/** The URL a newly created or password-resetting user is sent to. */
export function getSetPasswordUrl(): string {
  return `${getSiteUrl()}/REALESTATE_SOFTWARE/password/set-password`
}

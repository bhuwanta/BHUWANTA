import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Only the CRM, the real-estate software and the API need the Supabase
// session: every auth rule in updateSession is for those paths. Running it for
// public pages added a round trip to Supabase Auth before every page view,
// including pages served straight from the cache.
const SESSION_PREFIXES = ['/crm', '/REALESTATE_SOFTWARE', '/api']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!SESSION_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     * - studio (Sanity Studio)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|studio).*)',
  ],
}

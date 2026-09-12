import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // A Server Action POSTs to the exact same URL as the page it's called
  // from, carrying this header (next/dist/esm/client/components/
  // app-router-headers.js's ACTION_HEADER). If any of the redirect
  // branches below fire for one of these requests, the browser's
  // fetchServerAction gets back an HTML redirect instead of the
  // RSC-encoded action result it expects and throws "An unexpected
  // response was received from the server" — not a code bug in the
  // action itself, just this proxy stepping on the action protocol.
  // Safe to skip: every mutating action in this codebase already calls
  // verifyCaller() (and the RBAC blocks below are explicitly documented
  // as a second, independent layer on top of that per-page/per-action
  // check, not the only one), so unauthenticated/wrong-role callers
  // still get rejected — as a normal JSON {success:false} response
  // instead of a redirect that breaks the client action fetcher.
  if (request.headers.get('next-action')) {
    return supabaseResponse
  }

  // If no user and trying to access admin dashboard, redirect to login.
  // /crm/login is the ONLY exemption on purpose: /crm/signup is left to
  // fall through to this redirect so nobody can self-register a CRM
  // account. CRM users are created by an admin. Don't add it here.
  if (
    !user &&
    request.nextUrl.pathname.startsWith('/crm') &&
    request.nextUrl.pathname !== '/crm/login'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/crm/login'
    return NextResponse.redirect(url)
  }

  // If user is trying to access login or signup but already logged in, redirect to admin
  // Unless they are disabled, in which case we sign them out and redirect to login
  if (user && user.user_metadata?.is_disabled) {
    if (request.nextUrl.pathname.startsWith('/crm')) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/crm/login'
      return NextResponse.redirect(url)
    }
  } else if (
    user &&
    (request.nextUrl.pathname === '/crm/login' || request.nextUrl.pathname === '/crm/signup')
  ) {
    const userRole = user.user_metadata?.role || 'Admin'
    const url = request.nextUrl.clone()
    url.pathname = userRole === 'Telecaller' ? '/crm/leads' : '/crm'
    return NextResponse.redirect(url)
  }

  // CRM membership, enforced at the edge as well as at login.
  //
  // The check above only asks "is there a session", and both portals share one
  // Supabase auth project — so a signed-in BDCP user could previously reach
  // /crm by URL, and the `user_metadata?.role || 'Admin'` default below would
  // treat them as a CRM Admin. Membership is the `profiles` table, so ask it.
  //
  // Uses the anon-key client built above with the visitor's own cookies,
  // against the "Users can view their own profile" policy (auth.uid() = id) —
  // the same shape as the S_realestate_users check further down, and for the
  // same reason: Edge middleware cannot run the service-role client.
  if (
    user &&
    request.nextUrl.pathname.startsWith('/crm') &&
    request.nextUrl.pathname !== '/crm/login'
  ) {
    const { data: crmProfile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (!crmProfile) {
      const url = request.nextUrl.clone()
      url.pathname = '/crm/login'
      return NextResponse.redirect(url)
    }
  }

  // RBAC for Telecallers: Restrict to /crm/leads
  if (
    user &&
    user.user_metadata?.role === 'Telecaller' &&
    request.nextUrl.pathname.startsWith('/crm') &&
    !request.nextUrl.pathname.startsWith('/crm/leads') &&
    request.nextUrl.pathname !== '/crm/login'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/crm/leads'
    return NextResponse.redirect(url)
  }

  // REALESTATE_SOFTWARE RBAC — defense-in-depth alongside each page's own
  // requireRole() call (role/platform/auth/auth.ts). That per-page check is the
  // primary guard; this is a second, independent layer at the edge so a
  // page that ever forgot to call it wouldn't be silently unprotected.
  // Uses the anon-key client (already built above with the visitor's own
  // cookies) against S_realestate_users' "Users can view own profile" RLS
  // policy (auth.uid() = id) — deliberately NOT the service-role client,
  // since that requires a Node `require()` that Edge middleware can't run.
  // Bulk password reset lives under role/it/modules for file
  // organization (it's an it/modules capability, same family as the
  // Visualize Hierarchy module), but — unlike everything else under
  // role/it/* — it's reachable by any authenticated, active role, not
  // just IT: a sales-tier role gets in once IT switches the "Bulk
  // Change Passwords" module on for them. The segment-based check below
  // can't express that (it only sees segment[3] === 'it', with no idea
  // this one path is different), so it's special-cased here — skipping
  // the coarse "must be IT" guard for this one path, not all of
  // role/it/*. The REAL, fine-grained decision (IT gets everyone,
  // everyone else only their own downline if enabled) is
  // requireBulkPasswordAccess() inside the route itself; this is only
  // the same "authenticated and active" floor every other role/* route
  // already gets.
  if (request.nextUrl.pathname === '/REALESTATE_SOFTWARE/role/it/modules/bulk-password-reset') {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/REALESTATE_SOFTWARE/login'

    if (!user) {
      return NextResponse.redirect(loginUrl)
    }

    const { data: profile } = await supabase.from('s_realestate_users').select('is_active').eq('id', user.id).maybeSingle()
    if (!profile || !profile.is_active) {
      return NextResponse.redirect(loginUrl)
    }

    return supabaseResponse
  }

  if (request.nextUrl.pathname.startsWith('/REALESTATE_SOFTWARE/role/')) {
    const segment = request.nextUrl.pathname.split('/')[3]
    // Falls back to the raw segment itself for any role not in the
    // static map — every sales-tier role's URL segment already equals
    // its role code by convention (director, rm, sr_core, ...), which
    // is exactly how a role created via the Commission Rates page
    // (migration 008 / S_role_definitions) is routed too. Only the
    // PascalCase admin-peer/standalone exceptions (GoverningCouncil,
    // OperationManager, Customer) need the static map at all.
    const expectedRoleEntry = REALESTATE_ROLE_BY_PATH_SEGMENT[segment] || segment
    const expectedRoles = Array.isArray(expectedRoleEntry) ? expectedRoleEntry : [expectedRoleEntry]

    // Preserves the original behavior for an empty/trailing segment
    // (e.g. a bare '/REALESTATE_SOFTWARE/role/'): skip the check rather
    // than comparing profile.role against ''.
    if (expectedRoles.some((r) => r)) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/REALESTATE_SOFTWARE/login'

      if (!user) {
        return NextResponse.redirect(loginUrl)
      }

      const { data: profile } = await supabase
        .from('s_realestate_users')
        .select('role, is_active')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile || !expectedRoles.includes(profile.role) || !profile.is_active) {
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  return supabaseResponse
}

const REALESTATE_ROLE_BY_PATH_SEGMENT: Record<string, string | string[]> = {
  it: 'it',
  ceo: 'ceo',
  // Full-screen visualizer page that lives outside any role's sidebar
  // shell, so its URL segment isn't a role code by the usual convention
  // and must be mapped here — otherwise the fallback-to-raw-segment
  // behavior below would compare profile.role against the literal
  // string 'hierarchy', which can never match and always bounces to
  // login. Who may actually open it is no longer a fixed list: IT and
  // Operation Manager always can, and any other role can be switched on
  // via the "Visualize Hierarchy" module (S_modules). That's a
  // request-time DB lookup, which this edge middleware deliberately
  // doesn't do — it stays the coarse layer (authenticated + active),
  // and the page's own guard plus getHierarchyChildrenAction's
  // requireCanViewHierarchy enforce the real module rule.
  hierarchy: ['it', 'ceo', 'governing_council', 'operation_manager', 'director', 'sr_core', 'core', 'gm', 'agm', 'rm', 'lio', 'lia'],
  // Same reasoning as 'hierarchy' above. IT and Operation Manager can
  // always open this (the per-transaction "Visualize" button on the
  // Payouts page); any other role can open it ONLY with ?scope=mine
  // (from their own Wallet, module-gated) — a request-time DB lookup
  // this edge middleware doesn't do, so it stays coarse here and the
  // page's own guard (role/payouts-visualize/page.tsx) plus
  // getMySaleLineageAction's own re-derivation of the caller enforce the
  // real rule: scope=mine only ever returns THAT caller's own payout
  // line, never anyone else's.
  'payouts-visualize': ['it', 'ceo', 'governing_council', 'operation_manager', 'director', 'sr_core', 'core', 'gm', 'agm', 'rm', 'lio', 'lia'],
  GoverningCouncil: 'governing_council',
  OperationManager: 'operation_manager',
  Customer: 'customer',
  director: 'director',
  sr_core: 'sr_core',
  core: 'core',
  gm: 'gm',
  agm: 'agm',
  rm: 'rm',
  lio: 'lio',
  lia: 'lia',
}

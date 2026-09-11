import { cache } from 'react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'

/**
 * Who is calling, resolved once per request.
 *
 * Establishing identity costs two network round trips — auth.getUser()
 * validates the JWT against the auth server, then the profile row supplies
 * the role — and all three guards below used to do both, independently.
 * A single admin page runs the middleware check, the page's requireRole,
 * PageModuleGuard, the layout's nav-module lookup, the sidebar badge and
 * the page's own data action: the same identity answered five or six
 * times over, ten-plus round trips, on every navigation.
 *
 * React's cache() dedupes it for the duration of one server request, so it
 * resolves once and every later caller reads the memo. Scope is per
 * request, so nothing leaks between users, and a Server Action invoked
 * later is a separate request that re-verifies from scratch — the
 * security properties are unchanged, only the repetition is gone.
 */
const resolveCaller = cache(
  async (): Promise<{ id: string; role: RealEstateRole; fullName: string | null; isActive: boolean } | null> => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const supabaseAdmin = createServiceClient()
    const { data: profile } = await supabaseAdmin
      .from('s_realestate_users')
      .select('role, full_name, is_active')
      .eq('id', user.id)
      .single()

    if (!profile) return null

    return {
      id: user.id,
      role: profile.role as RealEstateRole,
      fullName: (profile.full_name as string) ?? null,
      isActive: profile.is_active !== false,
    }
  }
)

/**
 * Server-side page guard: verifies the logged-in user's profile role
 * matches `expectedRole` (and is active), or redirects to login. Every
 * thin routing page under role/it, role/ceo, role/GoverningCouncil calls
 * this so a stale session or a direct URL hit for the wrong role can't
 * reach the page content.
 */
export async function requireRole(expectedRole: RealEstateRole) {
  const caller = await resolveCaller()

  if (!caller || caller.role !== expectedRole || !caller.isActive) {
    redirect('/REALESTATE_SOFTWARE/login')
  }

  return { userId: caller.id, role: caller.role, fullName: caller.fullName as string }
}

/**
 * Same page guard as requireRole, but for a page shared by more than one
 * role (e.g. the payout visualizer, which both IT and Operation Manager
 * can open) — matches if the caller's active profile role is anywhere
 * in `expectedRoles`, rather than exactly one fixed role.
 */
export async function requireAnyRole(expectedRoles: RealEstateRole[]) {
  const caller = await resolveCaller()

  if (!caller || !expectedRoles.includes(caller.role) || !caller.isActive) {
    redirect('/REALESTATE_SOFTWARE/login')
  }

  return { userId: caller.id, role: caller.role, fullName: caller.fullName as string }
}

/**
 * Action-level session verification. `requireRole` protects a *page* —
 * it does nothing for a Server Action invoked directly (Next.js Server
 * Actions are POST-able independent of which page rendered the button
 * that calls them). Every mutating action in this app takes a
 * `callerRole`/`callerId` pair as parameters for convenience, but those
 * are client-supplied and must never be trusted for authorization on
 * their own — a crafted call could pass `callerRole: 'it'` regardless of
 * who's actually logged in. This re-derives the truth from the real
 * session and the database, so callers can cross-check the claimed role
 * against what the caller is actually allowed to do.
 *
 * Returns null if there's no valid session or no matching active
 * profile — callers should treat that as "reject the action."
 */
export async function verifyCaller(): Promise<{ id: string; role: RealEstateRole } | null> {
  const caller = await resolveCaller()
  if (!caller || !caller.isActive) return null
  return { id: caller.id, role: caller.role }
}

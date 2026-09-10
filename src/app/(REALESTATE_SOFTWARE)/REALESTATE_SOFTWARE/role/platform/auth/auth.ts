import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'

/**
 * Server-side page guard: verifies the logged-in user's profile role
 * matches `expectedRole` (and is active), or redirects to login. Every
 * thin routing page under role/it, role/ceo, role/GoverningCouncil calls
 * this so a stale session or a direct URL hit for the wrong role can't
 * reach the page content.
 */
export async function requireRole(expectedRole: RealEstateRole) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/REALESTATE_SOFTWARE/login')
  }

  const supabaseAdmin = createServiceClient()
  const { data: profile } = await supabaseAdmin
    .from('s_realestate_users')
    .select('role, full_name, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== expectedRole || !profile.is_active) {
    redirect('/REALESTATE_SOFTWARE/login')
  }

  return { userId: user.id, role: profile.role as RealEstateRole, fullName: profile.full_name as string }
}

/**
 * Same page guard as requireRole, but for a page shared by more than one
 * role (e.g. the payout visualizer, which both IT and Operation Manager
 * can open) — matches if the caller's active profile role is anywhere
 * in `expectedRoles`, rather than exactly one fixed role.
 */
export async function requireAnyRole(expectedRoles: RealEstateRole[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/REALESTATE_SOFTWARE/login')
  }

  const supabaseAdmin = createServiceClient()
  const { data: profile } = await supabaseAdmin
    .from('s_realestate_users')
    .select('role, full_name, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !expectedRoles.includes(profile.role as RealEstateRole) || !profile.is_active) {
    redirect('/REALESTATE_SOFTWARE/login')
  }

  return { userId: user.id, role: profile.role as RealEstateRole, fullName: profile.full_name as string }
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const supabaseAdmin = createServiceClient()
  const { data: profile } = await supabaseAdmin
    .from('s_realestate_users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) return null

  return { id: user.id, role: profile.role as RealEstateRole }
}

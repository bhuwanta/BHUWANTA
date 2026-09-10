'use server'

// The registrations gates, plus the two queries platform/ui layouts call
// directly (the nav-link check and the sidebar badge count). These live in
// platform, not in modules/registration-status, because the shared shell
// must never depend on a switchable page module — and because
// requireCanCreateRegistration is also what modules/new-registration
// guards on, which would otherwise be a module-to-module dependency.

import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { isAdminPeer, isSalesRole, isOperationManager } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'
import { isMissingTableError, isModuleEnabledFor, getVisiblePendingRegistrationIds } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/data/registrations-scope'

/** Registration Status. IT/Company/Governing Council and the Operation
 * Manager always see it — it's their company-wide oversight view (§7d)
 * and isn't what this module governs. For a sales tier it's opt-out:
 * they see their own subtree only while the module allows it. */
export async function requireCanViewRegistrations() {
  const caller = await verifyCaller()
  if (!caller) return { ok: false as const, error: 'Not authenticated, or your account is inactive.' }
  if (isAdminPeer(caller.role) || isOperationManager(caller.role)) return { ok: true as const, caller }
  if (isSalesRole(caller.role) && !(await isModuleEnabledFor('registration_status', caller.role))) {
    return { ok: false as const, error: 'The Registration Status module is not enabled for your role.' }
  }
  return { ok: true as const, caller }
}

/** New Registration. CEO keeps the standing §7d exception (the one
 * admin peer allowed to submit a sale) unconditionally; every sales
 * tier goes through the module. IT and Governing Council still cannot
 * submit one at all, module or not. */
export async function requireCanCreateRegistration() {
  const caller = await verifyCaller()
  if (!caller) return { ok: false as const, error: 'Not authenticated, or your account is inactive.' }
  if (caller.role === 'ceo') return { ok: true as const, caller }
  if (!isSalesRole(caller.role)) {
    return { ok: false as const, error: 'Only sales-tier roles (and Company) can submit a New Registration.' }
  }
  if (!(await isModuleEnabledFor('new_registration', caller.role))) {
    return { ok: false as const, error: 'The New Registration module is not enabled for your role.' }
  }
  return { ok: true as const, caller }
}

/** Non-authoritative status checks for the CALLER's own session role —
 * they decide whether a nav link is drawn at all. The real gates are
 * requireCanViewRegistrations / requireCanCreateRegistration above,
 * re-derived from the session on every data call. */
export async function checkMyRegistrationModulesAction(): Promise<{ newRegistration: boolean; registrationStatus: boolean }> {
  const caller = await verifyCaller()
  if (!caller) return { newRegistration: false, registrationStatus: false }
  if (isAdminPeer(caller.role) || isOperationManager(caller.role)) {
    return { newRegistration: caller.role === 'ceo', registrationStatus: true }
  }
  if (!isSalesRole(caller.role)) return { newRegistration: false, registrationStatus: false }
  const [newRegistration, registrationStatus] = await Promise.all([
    isModuleEnabledFor('new_registration', caller.role),
    isModuleEnabledFor('registration_status', caller.role),
  ])
  return { newRegistration, registrationStatus }
}

/** Sidebar notification badge — counts pending registrations this
 * specific user hasn't acknowledged yet (S_registration_reads,
 * migration 006), NOT every pending registration. That distinction is
 * what makes "Mark all as read" able to clear the badge without
 * touching any registration's real status. */
export async function getPendingRegistrationCountAction() {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, count: 0 }

    const supabaseAdmin = createServiceClient()
    const pendingIds = await getVisiblePendingRegistrationIds(supabaseAdmin, caller)
    if (pendingIds === null) return { success: true, count: 0 }
    if (pendingIds.length === 0) return { success: true, count: 0 }

    const { data: reads, error: readsError } = await supabaseAdmin
      .from('s_registration_reads')
      .select('registration_id')
      .eq('user_id', caller.id)
      .in('registration_id', pendingIds)

    if (readsError) {
      // Table missing (migration 006 not applied yet) — fall back to the
      // old behavior of counting every pending registration rather than
      // hiding the badge entirely. PostgREST reports a missing table as
      // PGRST205 (schema-cache miss), not the raw Postgres 42P01, so
      // accept both.
      if (isMissingTableError(readsError)) {
        return { success: true, count: pendingIds.length }
      }
      throw readsError
    }

    const readIds = new Set((reads || []).map((r: any) => r.registration_id as string))
    return { success: true, count: pendingIds.filter((id) => !readIds.has(id)).length }
  } catch (error: any) {
    console.error('Error fetching pending registration count:', error)
    return { success: false, count: 0 }
  }
}


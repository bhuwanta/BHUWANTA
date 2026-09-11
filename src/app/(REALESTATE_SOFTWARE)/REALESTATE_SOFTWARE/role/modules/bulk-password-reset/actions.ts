'use server'

// Bulk Change Passwords. Its own module (module_key bulk_password_reset)
// with its own toggle, but the picker UI still lives on the User
// Management page, so modules/user-management imports from here.
//
// The streaming reset route at role/it/modules/bulk-password-reset stays
// where it is — that URL is live and carries a middleware exemption.

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { sendPasswordChangedEmail } from '@/lib/emails/resend'
import { isAdminPeer, isSalesRole, type RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'
import { getDownlineIds } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/org/downline'

export interface BulkPasswordUser {
  id: string
  full_name: string
  role: string
  bhuwanta_id: string | null
}

/** Who's allowed to run a bulk password reset, and how far it reaches.
 * IT always has it, unconditionally, company-wide. Beyond that it's
 * opt-in per role via the "Bulk Change Passwords" module (S_modules,
 * module_key 'bulk_password_reset', configured on the Modules page) —
 * and even when a role has it switched on, their reach is capped to
 * their OWN downline (their wing), never anyone else's team and never
 * upline. Re-derived from the real session on every call, exactly like
 * requireIt above — never trusts a client-claimed role or id list.
 * Exported: the streaming reset route (role/it/modules/
 * bulk-password-reset) needs this same scoping decision, re-verified
 * server-side against whatever ids the client actually sent, not just
 * used to decide what the picker shows. */
export async function requireBulkPasswordAccess(): Promise<
  | { ok: true; id: string; scope: 'all' }
  | { ok: true; id: string; scope: 'downline'; downlineIds: string[] }
  | { ok: false; error: string }
> {
  const caller = await verifyCaller()
  if (!caller) return { ok: false, error: 'Not authenticated, or your account is inactive.' }
  if (caller.role === 'it') return { ok: true, id: caller.id, scope: 'all' }

  const supabaseAdmin = createServiceClient()
  const { data: moduleData } = await supabaseAdmin.from('s_modules').select('enabled_roles').eq('module_key', 'bulk_password_reset').maybeSingle()
  const enabledRoles: string[] = (moduleData?.enabled_roles as string[]) || []
  if (!enabledRoles.includes(caller.role)) {
    return { ok: false, error: 'You do not have access to bulk password changes.' }
  }

  const downlineIds = await getDownlineIds(supabaseAdmin, caller.id)
  return { ok: true, id: caller.id, scope: 'downline', downlineIds }
}

/** Every account a bulk password reset can target, in one list (the
 * main table is paginated 50 at a time; this picker needs the whole
 * reachable set at once) — IT's own full roster, or a module-enabled
 * role's own downline, per requireBulkPasswordAccess above.
 *
 * Paged through in 1000-row batches on purpose: Supabase's hosted
 * PostgREST caps the rows a single query body returns at 1000 no matter
 * what range is asked for, so a plain select would silently stop at the
 * first thousand and quietly leave the rest unresettable — the same cap
 * that once made the IT dashboard report "Total Users: 1000" against a
 * real 1,093. Applied to the downline-scoped query too — a large wing
 * deserves the same guarantee as the company-wide list, not just IT's.
 *
 * The caller is deliberately excluded from the list: a bulk reset that
 * swept up whoever's running it would change their own password out
 * from under them mid-operation. Resetting their own stays a
 * single-account action on the Edit User modal, where it's deliberate. */
export async function getUsersForBulkPasswordAction(): Promise<{ success: boolean; error?: string; data: BulkPasswordUser[] }> {
  try {
    const verified = await requireBulkPasswordAccess()
    if (!verified.ok) return { success: false, error: verified.error, data: [] }

    const supabaseAdmin = createServiceClient()
    const idFilter = verified.scope === 'downline' ? verified.downlineIds.filter((id) => id !== verified.id) : null
    if (idFilter && idFilter.length === 0) return { success: true, data: [] }

    const all: BulkPasswordUser[] = []
    const PAGE = 1000

    for (let page = 0; ; page++) {
      let query = supabaseAdmin
        .from('s_realestate_users')
        .select('id, full_name, role, bhuwanta_id')
        .order('full_name', { ascending: true })
        .range(page * PAGE, page * PAGE + PAGE - 1)
      query = idFilter ? query.in('id', idFilter) : query.neq('id', verified.id)

      const { data, error } = await query
      if (error) throw error
      const batch = (data || []) as BulkPasswordUser[]
      all.push(...batch)
      if (batch.length < PAGE) break
    }

    return { success: true, data: all }
  } catch (error: any) {
    console.error('Error loading users for bulk password reset:', error)
    return { success: false, error: error.message || 'Failed to load users.', data: [] }
  }
}

/** UI-display-only check, same non-authoritative pattern as
 * checkUserManagementModuleStatusAction / checkHierarchyModuleStatusAction
 * — a sales-tier layout uses this to decide whether to show the "Bulk
 * Change Passwords" button at all. requireBulkPasswordAccess above (re-
 * derived from the real session on every real data call) is the actual
 * access control. */
export async function checkBulkPasswordModuleStatusAction(role: RealEstateRole) {
  try {
    const _caller = await verifyCaller();
    if (!_caller) return { success: false, isEnabled: false };
    const supabaseAdmin = createServiceClient()
    const { data: moduleData } = await supabaseAdmin.from('s_modules').select('enabled_roles').eq('module_key', 'bulk_password_reset').maybeSingle()
    if (!moduleData) return { success: true, isEnabled: false }
    const isEnabled = ((moduleData.enabled_roles as string[]) || []).includes(role)
    return { success: true, isEnabled }
  } catch (error: any) {
    console.error('Error checking bulk password reset module status:', error)
    return { success: false, isEnabled: false }
  }
}

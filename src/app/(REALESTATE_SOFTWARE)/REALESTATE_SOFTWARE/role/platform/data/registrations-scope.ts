// Scope + availability helpers shared by the registrations badge in
// platform/access and the registration-status module. Deliberately NOT a
// 'use server' file: getVisiblePendingRegistrationIds takes a Supabase
// client and isMissingTableError is synchronous, so neither could be
// exported from one. Keeping them in a single place is what stops the
// badge count and "mark all as read" from ever disagreeing about scope.

import { createServiceClient } from '@/lib/supabase/server'
import { isAdminPeer, isSalesRole, isOperationManager } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'
import { getDownlineIds } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/org/downline'

/** A "table doesn't exist" error, however it's reported: PostgREST
 * surfaces it as a PGRST205 schema-cache miss, raw Postgres as 42P01.
 * Used to degrade gracefully when migration 006 hasn't been run yet. */
export function isMissingTableError(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01'
}

/** Is `moduleKey` switched on for `role`? Missing module row reads as
 * enabled, NOT disabled: these two modules seed themselves on first
 * visit to the Modules page (ensureNewRegistrationModuleExists /
 * ensureRegistrationStatusModuleExists), so a system where IT hasn't
 * opened that page yet has no row at all — failing closed there would
 * lock every sales tier out of a core feature until IT happened to
 * click into Modules. */
export async function isModuleEnabledFor(moduleKey: string, role: string): Promise<boolean> {
  const supabaseAdmin = createServiceClient()
  const { data } = await supabaseAdmin.from('s_modules').select('enabled_roles').eq('module_key', moduleKey).maybeSingle()
  if (!data) return true
  return ((data.enabled_roles as string[]) || []).includes(role)
}

/** Ids of every `pending_registration` row this caller is allowed to
 * see — company-wide for IT/CEO/GC and Operation Manager, self+downline
 * for a sales tier (§4 walling). Shared by the badge count and the
 * mark-all-read action so the two can never disagree about scope. */
export async function getVisiblePendingRegistrationIds(
  supabaseAdmin: ReturnType<typeof createServiceClient>,
  caller: { id: string; role: Parameters<typeof isAdminPeer>[0] }
): Promise<string[] | null> {
  let query = supabaseAdmin.from('s_new_registrations').select('id').eq('status', 'pending_registration')

  if (!isAdminPeer(caller.role) && !isOperationManager(caller.role)) {
    if (!isSalesRole(caller.role)) return null
    const downlineIds = await getDownlineIds(supabaseAdmin, caller.id)
    query = query.in('submitted_by', [caller.id, ...downlineIds])
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []).map((r: any) => r.id as string)
}


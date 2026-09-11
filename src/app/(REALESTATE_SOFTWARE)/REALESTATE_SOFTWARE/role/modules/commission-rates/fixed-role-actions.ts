'use server'

// Renaming for the 5 FIXED roles (it/ceo/governing_council/
// operation_manager/customer) — kept separate from renameSalesRoleAction
// in actions.ts, which only ever writes to S_role_definitions. That
// table is exclusively the sales-tier cascade (rank NOT NULL UNIQUE);
// mixing these 5 rank-less roles into it would corrupt every
// rank-sensitive consumer (the payout chain walk in downline.ts,
// canCreateRoleDynamic, dynamic role routing). S_role_labels
// (migration 011) is a small, separate table for exactly this: a label
// override with no rank concept at all.

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { isAdminPeer, ROLE_LABELS, type RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'

const RENAMEABLE_FIXED_ROLES: RealEstateRole[] = ['ceo', 'governing_council']

async function requireAdminPeer() {
  const caller = await verifyCaller()
  if (!caller || !isAdminPeer(caller.role)) {
    return { ok: false as const, error: 'Only IT, CEO, or Governing Council can manage role names.' }
  }
  return { ok: true as const, id: caller.id }
}

/** Every fixed role's current label — a DB row if IT has renamed it,
 * else the ROLE_LABELS static default. No auth needed (read-only), same
 * as getSalesRoleOrderAction. Client components merge this into the
 * same dynamicLabels map they already build from getSalesRoleOrderAction,
 * so the existing `dynamicLabels[role] || ROLE_LABELS[role] || role`
 * lookup on every page just starts working for CEO/GC too. */
export async function getFixedRoleLabelsAction(): Promise<{ success: boolean; data: { role_code: string; label: string }[] }> {
  try {
    const _caller = await verifyCaller();
    if (!_caller) return { success: false, data: [] };
    const supabaseAdmin = createServiceClient()
    const { data } = await supabaseAdmin.from('s_role_labels').select('role_code, label')
    const overrides = new Map((data || []).map((r: any) => [r.role_code as string, r.label as string]))

    const fixedRoles: RealEstateRole[] = ['it', 'ceo', 'governing_council', 'operation_manager', 'customer']
    const result: { role_code: string; label: string }[] = fixedRoles.map((role) => ({
      role_code: role as string,
      label: (overrides.get(role) || ROLE_LABELS[role]) as string,
    }))

    return { success: true, data: result }
  } catch (error: any) {
    console.error('Error fetching fixed role labels:', error)
    return { success: false, data: [] }
  }
}

/** CEO -> "Company", Governing Council -> whatever IT wants. Only these
 * two: it/operation_manager/customer aren't commission roles and don't
 * appear as editable rows on the Roles / Commissions page. role_code
 * itself never changes here — routing, isAdminPeer, and the
 * RealEstateRole type all keep using the literal 'ceo'/'governing_council'
 * string throughout; this only changes what's displayed. */
export async function renameFixedRoleAction(roleCode: string, newLabel: string) {
  try {
    const verified = await requireAdminPeer()
    if (!verified.ok) return { success: false, error: verified.error }

    if (!RENAMEABLE_FIXED_ROLES.includes(roleCode as RealEstateRole)) {
      return { success: false, error: 'This role cannot be renamed.' }
    }

    const label = newLabel.trim()
    if (!label) return { success: false, error: 'Enter a role name.' }

    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin
      .from('s_role_labels')
      .upsert({ role_code: roleCode, label, updated_by: verified.id, updated_at: new Date().toISOString() }, { onConflict: 'role_code' })
    if (error) throw error

    return { success: true, message: `Renamed to "${label}".` }
  } catch (error: any) {
    console.error('Error renaming fixed role:', error)
    return { success: false, error: error.message || 'Failed to rename.' }
  }
}

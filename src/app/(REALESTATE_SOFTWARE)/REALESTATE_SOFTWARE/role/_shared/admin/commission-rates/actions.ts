'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth'
import { isAdminPeer, getSalesRoleOrder } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/permissions'
import { removeRoleFromAllModulesAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/modules/actions'

/** Client-callable wrapper around permissions.ts's getSalesRoleOrder —
 * client components (this page, PayoutsPage, ModuleCard) can't query
 * Postgres directly, so they fetch the real, current sales-tier cascade
 * order (built-in + any admin-created roles) through this instead of
 * importing the old static SALES_RANK_ORDER array. */
export async function getSalesRoleOrderAction() {
  try {
    const supabaseAdmin = createServiceClient()
    const order = await getSalesRoleOrder(supabaseAdmin)
    return { success: true, data: order }
  } catch (error: any) {
    console.error('Error fetching sales role order:', error)
    return { success: false, data: [] as { role_code: string; label: string }[] }
  }
}

/** Turns a human label into a role_code: lowercase, spaces/punctuation
 * to underscores, trimmed of leading/trailing underscores. Deliberately
 * simple/predictable rather than auto-suffixing on collision (e.g.
 * "sr_rm_2") — a collision is surfaced as a clear error instead, so the
 * admin picks a different label rather than getting a code they didn't
 * choose. */
function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const FIXED_ROLES = ['it', 'ceo', 'governing_council', 'operation_manager', 'customer']

/** Creates a brand-new sales-tier role — a row in S_role_definitions
 * (rank + label) and the matching S_commission_rates row (percentage),
 * together. `insertAfterRoleCode` is the role_code to place the new
 * role immediately below in rank order, or null to place it at the
 * very top (above every existing sales-tier role, including Director).
 * Rank is the average of its two new neighbors' ranks (or ±1 at either
 * end of the list) — inserting never touches any other row's rank.
 * Mirrors the rollback-on-partial-failure pattern used in
 * createExecutiveAction: if the commission-rate insert fails, the
 * role_definitions row is deleted so a role never exists half-created. */
export async function createSalesRoleAction(input: { label: string; percentage: number; insertAfterRoleCode: string | null }) {
  try {
    const verified = await requireAdminPeer();
    if (!verified.ok) return { success: false, error: verified.error };

    const label = input.label.trim()
    if (!label) return { success: false, error: 'Enter a role name.' }
    if (input.percentage < 0 || input.percentage > 100) {
      return { success: false, error: 'Percentage must be between 0 and 100.' }
    }

    const roleCode = slugify(label)
    if (!roleCode) return { success: false, error: 'Enter a role name with at least one letter or number.' }
    if (FIXED_ROLES.includes(roleCode)) {
      return { success: false, error: `"${label}" is a reserved role name — pick a different one.` }
    }

    const supabaseAdmin = createServiceClient()

    // Fetched directly (not via getSalesRoleOrder, which omits `rank` to
    // stay lean for its common callers) — used for both the uniqueness
    // check and the placement math below.
    const { data: rankedRows, error: rankError } = await supabaseAdmin.from('s_role_definitions').select('role_code, rank').order('rank', { ascending: true })
    if (rankError) throw rankError
    const rows = rankedRows || []

    if (rows.some((r: any) => r.role_code === roleCode)) {
      return { success: false, error: `A role with the code "${roleCode}" already exists — pick a different name.` }
    }

    // Compute the new rank from where it's being inserted — the average
    // of its two new neighbors (or ±1 at either end), so no other row's
    // rank needs to change.
    let rank: number
    if (rows.length === 0) {
      rank = 1
    } else if (input.insertAfterRoleCode === null) {
      rank = Number(rows[0].rank) - 1
    } else {
      const afterIndex = rows.findIndex((r: any) => r.role_code === input.insertAfterRoleCode)
      if (afterIndex === -1) return { success: false, error: 'Could not find the role to insert after.' }
      const afterRank = Number(rows[afterIndex].rank)
      const nextRank = afterIndex + 1 < rows.length ? Number(rows[afterIndex + 1].rank) : null
      rank = nextRank === null ? afterRank + 1 : (afterRank + nextRank) / 2
    }

    const { error: defError } = await supabaseAdmin
      .from('s_role_definitions')
      .insert({ role_code: roleCode, label, rank, is_system: false, created_by: verified.id })
    if (defError) {
      if (defError.code === '23505') {
        return { success: false, error: `A role with the code "${roleCode}" already exists — pick a different name.` }
      }
      throw defError
    }

    const { error: rateError } = await supabaseAdmin
      .from('s_commission_rates')
      .insert({ role: roleCode, percentage: input.percentage, updated_by: verified.id })
    if (rateError) {
      console.error('Error creating commission rate for new role, rolling back role definition:', rateError)
      await supabaseAdmin.from('s_role_definitions').delete().eq('role_code', roleCode)
      // The role code stops existing here, so any module grant naming
      // it has to go too — otherwise a later role reusing the code
      // would inherit whatever this one had been given.
      await removeRoleFromAllModulesAction(roleCode)
      return { success: false, error: 'Failed to set the commission rate — the new role was not created.' }
    }

    return { success: true, message: `Created "${label}" at ${input.percentage}%.`, roleCode }
  } catch (error: any) {
    console.error('Error creating sales role:', error)
    return { success: false, error: error.message || 'Failed to create role.' }
  }
}

/** Renames a sales-tier role's display label — the role_code itself
 * (used everywhere in URLs, permission checks, and existing user
 * records) never changes, only S_role_definitions.label. Works for
 * built-in roles (Director..LIA) and admin-created ones alike, since
 * both are just rows in the same table. Does NOT cover ceo/
 * governing_council/it/operation_manager/customer — those 5 are fixed,
 * hardcoded role labels (ROLE_LABELS in permissions.ts), not database
 * rows, so there's nothing here to rename them to yet. */
export async function renameSalesRoleAction(roleCode: string, newLabel: string) {
  try {
    const verified = await requireAdminPeer();
    if (!verified.ok) return { success: false, error: verified.error };

    const label = newLabel.trim()
    if (!label) return { success: false, error: 'Enter a role name.' }

    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin.from('s_role_definitions').update({ label }).eq('role_code', roleCode)
    if (error) throw error

    return { success: true, message: `Renamed to "${label}".` }
  } catch (error: any) {
    console.error('Error renaming sales role:', error)
    return { success: false, error: error.message || 'Failed to rename.' }
  }
}

export async function getCommissionRatesAction() {
  try {
    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
      .from('s_commission_rates')
      .select('role, percentage, updated_by, updated_at, updater:s_realestate_users!updated_by(full_name)')

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error fetching commission rates:', error)
    return { success: false, data: [] }
  }
}

/** §2 peer rule: writable by it/ceo/governing_council only. Verified
 * against the real session (not a client-supplied role) — see
 * ../../auth.ts's verifyCaller for why that matters. */
async function requireAdminPeer() {
  const caller = await verifyCaller()
  if (!caller || !isAdminPeer(caller.role)) {
    return { ok: false as const, error: 'Only IT, CEO, or Governing Council can manage commission rates.' };
  }
  return { ok: true as const, id: caller.id };
}

export async function updateCommissionRateAction(role: string, percentage: number) {
  try {
    const verified = await requireAdminPeer();
    if (!verified.ok) return { success: false, error: verified.error };

    if (percentage < 0 || percentage > 100) {
      return { success: false, error: 'Percentage must be between 0 and 100.' }
    }

    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin
      .from('s_commission_rates')
      .update({ percentage, updated_by: verified.id, updated_at: new Date().toISOString() })
      .eq('role', role)

    if (error) throw error

    return { success: true, message: `Updated ${role.replace('_', ' ')} to ${percentage}%.` }
  } catch (error: any) {
    console.error('Error updating commission rate:', error)
    return { success: false, error: error.message || 'Failed to update rate.' }
  }
}

/** Adds a rate row for a role that doesn't currently have one — normally
 * unnecessary (all 10 sales-eligible roles are seeded on schema setup),
 * but kept as an explicit recovery path rather than requiring a manual
 * SQL insert if a row is ever missing. */
export async function createCommissionRateAction(role: string, percentage: number) {
  try {
    const verified = await requireAdminPeer();
    if (!verified.ok) return { success: false, error: verified.error };

    if (percentage < 0 || percentage > 100) {
      return { success: false, error: 'Percentage must be between 0 and 100.' }
    }

    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin
      .from('s_commission_rates')
      .insert({ role, percentage, updated_by: verified.id })

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'This role already has a rate — edit it instead.' }
      }
      throw error
    }

    return { success: true, message: `Added ${role.replace('_', ' ')} at ${percentage}%.` }
  } catch (error: any) {
    console.error('Error creating commission rate:', error)
    return { success: false, error: error.message || 'Failed to add rate.' }
  }
}

/** Deletes a rate row entirely. Confirmed dangerous on purpose — a role
 * with no rate row is excluded from computeCommissionBreakdown (it just
 * skips roles missing from the rates map, see commission.ts), so
 * deleting a rate silently removes that tier from every future payout,
 * not just this page. The UI makes the caller confirm explicitly. */
export async function deleteCommissionRateAction(role: string) {
  try {
    const verified = await requireAdminPeer();
    if (!verified.ok) return { success: false, error: verified.error };

    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin
      .from('s_commission_rates')
      .delete()
      .eq('role', role)

    if (error) throw error

    return { success: true, message: `Removed the rate for ${role.replace('_', ' ')}.` }
  } catch (error: any) {
    console.error('Error deleting commission rate:', error)
    return { success: false, error: error.message || 'Failed to delete rate.' }
  }
}

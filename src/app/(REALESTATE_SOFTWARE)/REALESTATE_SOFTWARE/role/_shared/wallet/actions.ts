'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { isCommissionEligible, isAdminPeer, isSalesRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'

/** My Wallet's module gate. Company and Governing Council always keep
 * their own wallet (admin peers, §2) and IT never had one at all
 * (isCommissionEligible('it') === false) — this only governs the eight
 * sales tiers. A missing module row reads as enabled, since the row is
 * only created the first time IT opens the Modules page and failing
 * closed there would hide everyone's earnings until they did. */
export async function requireCanViewWallet() {
  const caller = await verifyCaller()
  if (!caller) return { ok: false as const, error: 'Not authenticated, or your account is inactive.' }
  if (!isCommissionEligible(caller.role)) return { ok: false as const, error: 'This role does not earn commission.' }
  if (isAdminPeer(caller.role) || !isSalesRole(caller.role)) return { ok: true as const, caller }

  const supabaseAdmin = createServiceClient()
  const { data } = await supabaseAdmin.from('s_modules').select('enabled_roles').eq('module_key', 'wallet').maybeSingle()
  if (data && !((data.enabled_roles as string[]) || []).includes(caller.role)) {
    return { ok: false as const, error: 'The My Wallet module is not enabled for your role.' }
  }
  return { ok: true as const, caller }
}

/** Non-authoritative check for the caller's own session role — decides
 * whether SalesLayout draws the nav link. requireCanViewWallet above is
 * the real gate. */
export async function checkMyWalletModuleAction(): Promise<boolean> {
  const res = await requireCanViewWallet()
  return res.ok
}

/**
 * "My Wallet" — every payout line ever generated for the verified
 * caller, with enough context (which sale, which project, who actually
 * sold it) to answer "who sold what and how did I get this money."
 *
 * Strictly scoped to `payee_id = caller.id` — this is the ONLY filter,
 * and it's what makes the hierarchy rule automatic rather than
 * something bolted on: a payout row only exists for the seller
 * themselves plus their own real upline chain (payout-engine.ts never
 * creates a row for anyone in the seller's downline). So if an RM sells
 * directly, no payout row is ever created for that RM's LIO/LIA at all
 * — there's nothing to filter, they were never eligible for a row on
 * that sale in the first place. A bottom-tier caller can never see an
 * upline's cut through this action, on this sale or any other, because
 * their own id never matches an upline's payee_id.
 *
 * IT is excluded entirely (isCommissionEligible('it') === false, IT is
 * never a payee) and Customer likewise isn't part of the commission
 * chain — this action simply returns nothing useful for either.
 */
export async function getMyPayoutsAction() {
  try {
    const verified = await requireCanViewWallet()
    if (!verified.ok) {
      return { success: false, data: [] as any[], totals: { totalEarned: 0, totalPending: 0, totalCompleted: 0 }, error: verified.error }
    }
    const caller = verified.caller

    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
      .from('s_sales_payouts')
      .select(`
        id, role, commission_percentage, tier_percentage, previous_tier_percentage, computed_amount, amount, payout_status, scheduled_for, processed_at, created_at,
        s_new_registrations (
          id, plot_size_sqyd, submitted_at, customer_name,
          s_areas ( name ),
          s_projects ( name ),
          seller:s_realestate_users!submitted_by ( full_name, role )
        )
      `)
      .eq('payee_id', caller.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const rows = data || []
    // Computed here, server-side, from the fetched rows — the page
    // never sums/filters money itself, only renders these numbers.
    let totalEarned = 0
    let totalCompleted = 0
    for (const row of rows as any[]) {
      totalEarned += Number(row.amount)
      if (row.payout_status === 'completed') totalCompleted += Number(row.amount)
    }
    const totalPending = totalEarned - totalCompleted

    return { success: true, data: rows, totals: { totalEarned, totalPending, totalCompleted } }
  } catch (error: any) {
    console.error('Error fetching my payouts:', error)
    return { success: false, data: [] as any[], totals: { totalEarned: 0, totalPending: 0, totalCompleted: 0 }, error: error.message }
  }
}

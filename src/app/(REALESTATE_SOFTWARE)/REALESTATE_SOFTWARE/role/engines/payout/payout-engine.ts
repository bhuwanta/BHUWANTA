'use server'

// Commission payout engine — HIERARCHY.md §3b/§10 item 3. Triggered by
// markRegistrationDoneAction (registrations/actions.ts) the moment a
// registration's status flips to 'registration_done'. Walks the
// seller's real upline chain, applies the tiered-percentage-difference
// formula (commission.ts, pure/no I/O), and writes one S_sales_payouts
// row per participant.

import { createServiceClient } from '@/lib/supabase/server'
import { getUplineChain } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/org/downline'
import { computeCommissionBreakdown, computePool, type CommissionRatesMap } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/engines/payout/commission'
import type { RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'

type ServiceClient = ReturnType<typeof createServiceClient>

const PAYOUT_DELAY_MS = 48 * 60 * 60 * 1000 // 48h, §3c step 10

export async function runCommissionPayout(supabaseAdmin: ServiceClient, registrationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: registration, error: regError } = await supabaseAdmin
      .from('s_new_registrations')
      .select('plot_size_sqyd, base_price_at_submission, submitted_by, seller:s_realestate_users!submitted_by(role)')
      .eq('id', registrationId)
      .single()

    if (regError || !registration) {
      return { success: false, error: 'Registration not found for payout calculation.' }
    }

    const sellerRole = (registration.seller as any)?.role as RealEstateRole | undefined
    if (!sellerRole) {
      return { success: false, error: 'Could not resolve seller role for payout calculation.' }
    }

    const pool = computePool(Number(registration.plot_size_sqyd), Number(registration.base_price_at_submission))
    if (pool <= 0) {
      return { success: false, error: 'Commission pool is zero or invalid (check plot size and Base Price) — no payouts created.' }
    }

    const uplineChain = await getUplineChain(supabaseAdmin, registration.submitted_by, sellerRole)

    const { data: ratesData } = await supabaseAdmin.from('s_commission_rates').select('role, percentage')
    const rates: CommissionRatesMap = {}
    ;(ratesData || []).forEach((r: any) => {
      rates[r.role as RealEstateRole] = Number(r.percentage)
    })

    // Filter the seller + chain down to only roles that actually have a
    // rate set, BEFORE calling computeCommissionBreakdown — that keeps
    // this array's indices aligned 1:1 with the returned CommissionLine
    // array, so payee_id can be zipped in by position without the two
    // silently drifting apart if e.g. a rate was deleted (commission-
    // rates/actions.ts's deleteCommissionRateAction) for a role
    // mid-chain.
    const fullChain: { id: string; role: RealEstateRole }[] = [{ id: registration.submitted_by, role: sellerRole }, ...uplineChain]
    const eligibleChain = fullChain.filter((p) => rates[p.role] != null)

    if (eligibleChain.length === 0) {
      return { success: false, error: 'No commission-eligible roles with a rate set in this chain — no payouts created.' }
    }

    const lines = computeCommissionBreakdown(
      eligibleChain[0].role,
      eligibleChain.slice(1).map((c) => c.role),
      pool,
      rates
    )

    // Migration 013: a role scoped 'company_wide_split' (e.g. CEO) still
    // gets one full-marginal line PER active holder out of
    // computeCommissionBreakdown above — that function deliberately
    // doesn't know several people share a tier (see its own doc
    // comment). Here, those already-computed lines are divided back down
    // equally among however many holders of that role are actually in
    // this chain, so the group earns the tier's marginal cut once, split
    // N ways, instead of each holder earning it in full. Re-ceils each
    // person's own share to the next whole rupee, same rounding policy
    // commission.ts already applies before any splitting.
    const { data: splitScopeRows } = await supabaseAdmin.from('s_payout_rules').select('role_code').eq('scope', 'company_wide_split')
    const splitRoles = new Set((splitScopeRows || []).map((r: any) => r.role_code as string))

    // The seller (always index 0) is excluded from both the count and
    // the division: their line is a personal commission for closing the
    // sale at their own full rate, not the role-level band their
    // colleagues share. A CEO who sells keeps their whole 30%; the OTHER
    // active CEOs split the 3% band between them.
    const roleCounts = new Map<string, number>()
    eligibleChain.slice(1).forEach((c) => roleCounts.set(c.role, (roleCounts.get(c.role) || 0) + 1))

    const splitLines = lines.map((line, i) => {
      const n = roleCounts.get(line.role) || 1
      if (i === 0 || !splitRoles.has(line.role) || n <= 1) return line
      const rawAmountPaise = Math.round(line.rawAmount * 100) / n
      return { ...line, percentage: line.percentage / n, rawAmount: rawAmountPaise / 100, amount: Math.ceil(rawAmountPaise / 100) }
    })

    const scheduledFor = new Date(Date.now() + PAYOUT_DELAY_MS).toISOString()

    // Zip payee ids in by position FIRST, then drop the zero-amount
    // lines — filtering before the zip would shift every index and pay
    // the wrong people. A line can legitimately land on 0%: a tier whose
    // rate sits at or below the tier beneath it in this particular chain
    // (clampNonNegative in commission.ts), most notably the Governing
    // Council entry that exists purely to anchor the baseline when a CEO
    // is the seller. Those carry no money, so writing them would just be
    // ₹0 noise in everyone's Payouts and Wallet views.
    const rows = splitLines
      .map((line, i) => ({
        registration_id: registrationId,
        payee_id: eligibleChain[i].id,
        role: line.role,
        commission_percentage: line.percentage,
        tier_percentage: line.tierPercentage,
        previous_tier_percentage: line.previousTierPercentage,
        computed_amount: line.rawAmount,
        amount: line.amount,
        payout_status: 'pending' as const,
        scheduled_for: scheduledFor,
      }))
      .filter((row) => row.amount > 0)

    if (rows.length === 0) {
      return { success: false, error: 'Every commission line computed to zero for this chain — no payouts created.' }
    }

    const { error: insertError } = await supabaseAdmin.from('s_sales_payouts').insert(rows)
    if (insertError) {
      // 23505 = unique_violation on (registration_id, payee_id) —
      // migration 007's dedup constraint. Reaching this means payouts
      // for this registration already exist (e.g. this function somehow
      // got invoked twice for the same sale); treat it as already-done
      // rather than a failure, so the caller doesn't surface a scary
      // error for something that isn't actually broken.
      if (insertError.code === '23505') {
        return { success: true }
      }
      console.error('Error writing payout rows:', insertError)
      return { success: false, error: insertError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error running commission payout:', error)
    return { success: false, error: error.message || 'Failed to compute payouts.' }
  }
}

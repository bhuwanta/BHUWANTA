'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth'
import { isAdminPeer, isOperationManager } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/permissions'
import { computePool } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/commission'
import { requirePageModule } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/nav-modules'

/** IT/CEO/Governing Council keep read-only company-wide visibility into
 * the payout queue (oversight, same as Registrations §7), but ONLY
 * Operation Manager can act on it (§7d) — see requireOperationManager
 * below. This is the disbursement side of the pipeline: the payout
 * engine (payout-engine.ts) only ever writes rows as 'pending' —
 * nothing else moves them forward, since there's no real payment
 * gateway wired up (same reason customer payment is a manual "Mark as
 * Paid" stub, not real Razorpay). */
async function requireCanViewPayouts() {
  const caller = await verifyCaller()
  if (!caller || !(isAdminPeer(caller.role) || isOperationManager(caller.role))) {
    return { ok: false as const, error: 'Only IT, Company, Governing Council, or Operation Manager can view payouts.' }
  }
  // On top of the role check: Company and Governing Council also need
  // the Payouts module switched on for them. IT and the Operation
  // Manager aren't governed by it (requirePageModule waves them
  // through), so this can't take the page away from the two roles that
  // have to run the disbursement pipeline.
  const mod = await requirePageModule('payouts')
  if (!mod.ok) return { ok: false as const, error: mod.error }
  return { ok: true as const, role: caller.role }
}

/** The sole authorized approver for actually marking a payout paid. */
async function requireOperationManager() {
  const caller = await verifyCaller()
  if (!caller || !isOperationManager(caller.role)) {
    return { ok: false as const, error: 'Only the Operation Manager can approve payouts.' }
  }
  return { ok: true as const, id: caller.id }
}

/** Per-sale totals the Payouts page needs (total distributed, how many
 * lines are still pending) — computed here, server-side, from the DB
 * rows. The page groups/displays these; it never sums or counts money
 * itself. Keyed by registration id. */
export interface SaleTotals {
  totalDistributed: number
  pendingCount: number
  lineCount: number
}

export async function getAllPayoutsAction() {
  try {
    const verified = await requireCanViewPayouts()
    if (!verified.ok) return { success: false, data: [] as any[], saleTotals: {} as Record<string, SaleTotals>, canApprove: false, error: verified.error }

    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
      .from('s_sales_payouts')
      .select(`
        id, role, commission_percentage, tier_percentage, previous_tier_percentage, computed_amount, amount, payout_status, scheduled_for, processed_at, created_at,
        payee:s_realestate_users!payee_id ( full_name ),
        s_new_registrations (
          id, plot_size_sqyd, submitted_at, customer_name,
          s_projects ( name ),
          s_areas ( name ),
          seller:s_realestate_users!submitted_by ( full_name, role )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    const rows = data || []
    const saleTotals: Record<string, SaleTotals> = {}
    for (const row of rows as any[]) {
      const regId = row.s_new_registrations?.id
      if (!regId) continue
      if (!saleTotals[regId]) saleTotals[regId] = { totalDistributed: 0, pendingCount: 0, lineCount: 0 }
      saleTotals[regId].totalDistributed += Number(row.amount)
      saleTotals[regId].lineCount += 1
      if (row.payout_status === 'pending' || row.payout_status === 'processing') saleTotals[regId].pendingCount += 1
    }

    return { success: true, data: rows, saleTotals, canApprove: isOperationManager(verified.role) }
  } catch (error: any) {
    console.error('Error fetching all payouts:', error)
    return { success: false, data: [] as any[], saleTotals: {} as Record<string, SaleTotals>, canApprove: false, error: error.message }
  }
}

/** Per-payee detail for the graph's own cards — their tier % and the
 * real amount they got on THIS sale, straight from S_sales_payouts, not
 * recomputed. */
export interface PayeeFinancial {
  role: string
  percentage: number
  amount: number
  /** This role's own full tier rate, and whichever rate sits directly
   * below them in this specific chain (0 for the seller — nobody below
   * them earned into their share). percentage above is always
   * tierPercentage - previousTierPercentage, EXCEPT the seller, who
   * earns their full tierPercentage regardless of what's below them —
   * same distinction PayoutsPage.tsx's own breakdown already draws.
   * Carried so the card can show the actual subtraction, not just the
   * answer. */
  tierPercentage: number
  previousTierPercentage: number
  /** How many people are currently sharing this role's marginal cut on
   * THIS sale (migration 013 — a 'company_wide_split' role, e.g. CEO,
   * divides its cut equally among however many active holders were in
   * the chain when payout-engine.ts ran). 1 for every non-split role,
   * and for a split role with only one active holder. `percentage`/
   * `amount` above are already the real, divided-down per-person figures
   * straight from S_sales_payouts — this is only carried so the card can
   * add a "split N ways" note, not to redo any math. */
  splitCount: number
}

/** Everything the graph needs to draw the actual math for one sale — a
 * customer card showing land value vs. what they paid, and per-payee
 * cards showing their own cut. computePool is the SAME function
 * payout-engine.ts uses to build the real commission pool
 * (plotSize × rate, paisa-precise); reused here twice — once against
 * base_price_at_submission for the pool commissions are actually cut
 * from, once against mrp_at_submission for the customer's real total
 * (payout-engine.ts's own comment documents this second use, matching
 * the customer portal's own "Total Amount" figure) — never invented
 * separately from what the rest of the app already treats as ground
 * truth. */
export interface SaleFinancials {
  customerId: string | null
  customerName: string
  plotSizeSqyd: number
  basePricePerSqyd: number
  mrpPerSqyd: number
  totalCustomerPaid: number
  commissionPool: number
  totalCommissionPaid: number
  payeeDetails: Record<string, PayeeFinancial>
}

/** Who actually got paid on one specific sale — the real S_sales_payouts
 * rows for `registrationId`, not a hypothetical preview against a
 * nominal pool. Drives the per-card "Visualize" button on the Payouts
 * page: each transaction highlights exactly its own seller + payee
 * chain on the hierarchy graph, not a role-wide guess. */
export async function getPayoutLineageForRegistrationAction(registrationId: string) {
  try {
    const verified = await requireCanViewPayouts()
    if (!verified.ok)
      return {
        success: false,
        error: verified.error,
        sellerId: null as string | null,
        payeeIds: [] as string[],
        sellerName: '',
        projectName: '',
        plotSize: null as number | null,
        expandPath: [] as string[],
        financials: null as SaleFinancials | null,
      }

    const supabaseAdmin = createServiceClient()
    const [{ data: reg }, { data: lines }] = await Promise.all([
      supabaseAdmin
        .from('s_new_registrations')
        .select(
          `id, submitted_by, plot_size_sqyd, base_price_at_submission, mrp_at_submission, customer_name, customer_user_id,
           seller:s_realestate_users!submitted_by ( full_name ),
           s_projects ( name )`
        )
        .eq('id', registrationId)
        .maybeSingle(),
      supabaseAdmin.from('s_sales_payouts').select('payee_id, role, commission_percentage, tier_percentage, previous_tier_percentage, amount').eq('registration_id', registrationId),
    ])
    if (!reg)
      return {
        success: false,
        error: 'Sale not found.',
        sellerId: null as string | null,
        payeeIds: [] as string[],
        sellerName: '',
        projectName: '',
        plotSize: null as number | null,
        expandPath: [] as string[],
        financials: null as SaleFinancials | null,
      }

    // The exact nodes the hierarchy graph must expand to bring the
    // seller on screen, in top-down order: the seller's assigned
    // Governing Council, their Director, then every rung of the
    // parent_id chain down to the seller's own parent. Resolved
    // structurally rather than by following whoever happens to be
    // highlighted — a mid-chain person with earns_commission switched
    // off isn't a payee, and a highlight-driven walk would stop dead at
    // them and hide everyone below.
    const expandPath: string[] = []
    const ancestors: string[] = []
    let directorId: string | null = null

    const { data: sellerUser } = await supabaseAdmin.from('s_realestate_users').select('id, role, parent_id').eq('id', reg.submitted_by).maybeSingle()
    if (sellerUser?.role === 'director') directorId = sellerUser.id as string

    let cursor: any = sellerUser
    // Bounded rather than while(true): the sales cascade is at most a
    // handful of tiers, and a cyclic parent_id would otherwise hang the
    // request.
    for (let hops = 0; cursor?.parent_id && hops < 25; hops++) {
      const { data: parent } = await supabaseAdmin.from('s_realestate_users').select('id, role, parent_id').eq('id', cursor.parent_id).maybeSingle()
      if (!parent) break
      ancestors.push(parent.id as string)
      if (parent.role === 'director') {
        directorId = parent.id as string
        break
      }
      cursor = parent
    }

    // The top of the tree (the Company account, role 'ceo') always
    // opens, regardless of this particular sale's chain. It doesn't sit
    // in anyone's parent_id line — it's paid company-wide, not through
    // the wing — so a path built only from ancestors would leave the
    // graph collapsed above the Governing Council and hide a payee who
    // IS on this sale.
    const { data: topRows } = await supabaseAdmin.from('s_realestate_users').select('id').eq('role', 'ceo').eq('is_active', true)
    expandPath.push(...(topRows || []).map((r: any) => r.id as string))

    if (directorId) {
      const { data: assignment } = await supabaseAdmin.from('s_director_gc').select('gc_id').eq('director_id', directorId).maybeSingle()
      if (assignment?.gc_id) expandPath.push(assignment.gc_id as string)
    }
    // ancestors runs seller-upward (…Director last); the graph expands
    // downward, so it's reversed here.
    expandPath.push(...ancestors.slice().reverse())

    const plotSize = Number(reg.plot_size_sqyd)
    const payeeDetails: Record<string, PayeeFinancial> = {}
    let totalCommissionPaid = 0

    // How many payout rows on THIS sale share the same role — a
    // 'company_wide_split' role (e.g. 3 active CEOs) produces one row
    // per holder, each already carrying the divided-down percentage/
    // amount; counting them here is enough to know "split N ways"
    // without re-deriving the math from S_payout_rules.
    //
    // The seller's own row is excluded, exactly as payout-engine.ts
    // excludes it from the split itself — theirs is a personal
    // full-rate commission for closing the sale, not a share of the
    // role's band. previous_tier_percentage === 0 identifies it as a
    // stored DB fact (nobody below them in this chain), the same test
    // PayoutsPage.tsx already uses to find the seller.
    const roleCounts = new Map<string, number>()
    ;(lines || []).forEach((l: any) => {
      if (Number(l.previous_tier_percentage) === 0) return
      roleCounts.set(l.role as string, (roleCounts.get(l.role as string) || 0) + 1)
    })

    ;(lines || []).forEach((l: any) => {
      const amount = Number(l.amount)
      const isSeller = Number(l.previous_tier_percentage) === 0
      payeeDetails[l.payee_id as string] = {
        role: l.role as string,
        percentage: Number(l.commission_percentage),
        amount,
        tierPercentage: Number(l.tier_percentage),
        previousTierPercentage: Number(l.previous_tier_percentage),
        splitCount: isSeller ? 1 : roleCounts.get(l.role as string) || 1,
      }
      totalCommissionPaid += amount
    })

    const financials: SaleFinancials = {
      customerId: (reg.customer_user_id as string) || null,
      customerName: (reg.customer_name as string) || 'Unknown',
      plotSizeSqyd: plotSize,
      basePricePerSqyd: Number(reg.base_price_at_submission),
      mrpPerSqyd: Number(reg.mrp_at_submission),
      totalCustomerPaid: computePool(plotSize, Number(reg.mrp_at_submission)),
      commissionPool: computePool(plotSize, Number(reg.base_price_at_submission)),
      totalCommissionPaid,
      payeeDetails,
    }

    return {
      success: true,
      sellerId: reg.submitted_by as string,
      payeeIds: (lines || []).map((l: any) => l.payee_id as string),
      sellerName: (reg as any).seller?.full_name || '',
      projectName: (reg as any).s_projects?.name || '',
      plotSize: reg.plot_size_sqyd as number | null,
      expandPath,
      financials,
    }
  } catch (error: any) {
    console.error('Error fetching payout lineage:', error)
    return {
      success: false,
      error: error.message || 'Failed to load who got paid.',
      sellerId: null as string | null,
      payeeIds: [] as string[],
      sellerName: '',
      projectName: '',
      plotSize: null as number | null,
      expandPath: [] as string[],
      financials: null as SaleFinancials | null,
    }
  }
}

/** The wallet-scoped version of the visualizer: what ONE payee is
 * allowed to see about a sale they personally earned on. Rooted at the
 * caller's own node rather than the Company, so the tree only ever runs
 * DOWNWARD from them — an LA who sold sees themselves and the customer,
 * a Director sees the branch of their own team that led to the sale.
 *
 * Entitlement is "you have a payout row on this sale", not a role check:
 * this is reached from their own Wallet, where every row is by
 * definition a line they were paid. Deliberately narrower than
 * getPayoutLineageForRegistrationAction above — only the caller's OWN
 * commission is returned, never anyone else's, so nobody learns what
 * their upline or downline earned from a page about their own wallet. */
export async function getMySaleLineageAction(registrationId: string) {
  const empty = {
    success: false,
    error: '',
    rootId: null as string | null,
    sellerId: null as string | null,
    expandPath: [] as string[],
    sellerName: '',
    projectName: '',
    plotSize: null as number | null,
    financials: null as SaleFinancials | null,
  }

  try {
    const caller = await verifyCaller()
    if (!caller) return { ...empty, error: 'Not authenticated.' }

    const supabaseAdmin = createServiceClient()

    const { data: myLine } = await supabaseAdmin
      .from('s_sales_payouts')
      .select('payee_id, role, commission_percentage, tier_percentage, previous_tier_percentage, amount')
      .eq('registration_id', registrationId)
      .eq('payee_id', caller.id)
      .maybeSingle()

    if (!myLine) return { ...empty, error: 'You were not paid on this sale.' }

    const { data: reg } = await supabaseAdmin
      .from('s_new_registrations')
      .select(
        `id, submitted_by, plot_size_sqyd, base_price_at_submission, mrp_at_submission, customer_name, customer_user_id,
         seller:s_realestate_users!submitted_by ( full_name ),
         s_projects ( name )`
      )
      .eq('id', registrationId)
      .maybeSingle()
    if (!reg) return { ...empty, error: 'Sale not found.' }

    // Walk UP from the seller until we reach the caller, then reverse —
    // that gives the ids between the caller and the seller, which is
    // exactly what the graph has to open to bring the seller (and the
    // customer hanging off them) on screen. A seller who IS the caller
    // yields an empty path: nothing to expand, their own node is the
    // whole tree.
    const ancestors: string[] = []
    let cursorId: string | null = reg.submitted_by as string
    for (let hops = 0; cursorId && cursorId !== caller.id && hops < 25; hops++) {
      const { data } = await supabaseAdmin.from('s_realestate_users').select('id, parent_id').eq('id', cursorId).maybeSingle()
      const person = data as { id: string; parent_id: string | null } | null
      if (!person) break
      if (person.id !== reg.submitted_by) ancestors.push(person.id)
      cursorId = person.parent_id || null
    }
    const expandPath = ancestors.reverse()

    const plotSize = Number(reg.plot_size_sqyd)
    const financials: SaleFinancials = {
      customerId: (reg.customer_user_id as string) || null,
      customerName: (reg.customer_name as string) || 'Unknown',
      plotSizeSqyd: plotSize,
      basePricePerSqyd: Number(reg.base_price_at_submission),
      mrpPerSqyd: Number(reg.mrp_at_submission),
      totalCustomerPaid: computePool(plotSize, Number(reg.mrp_at_submission)),
      commissionPool: computePool(plotSize, Number(reg.base_price_at_submission)),
      // Their own line only — not the sale's full payout total, which
      // would leak the rest of the chain's earnings by subtraction.
      totalCommissionPaid: Number(myLine.amount),
      payeeDetails: {
        [caller.id]: {
          role: myLine.role as string,
          percentage: Number(myLine.commission_percentage),
          amount: Number(myLine.amount),
          tierPercentage: Number(myLine.tier_percentage),
          previousTierPercentage: Number(myLine.previous_tier_percentage),
          splitCount: 1,
        },
      },
    }

    return {
      success: true,
      error: '',
      rootId: caller.id,
      sellerId: reg.submitted_by as string,
      expandPath,
      sellerName: (reg as any).seller?.full_name || '',
      projectName: (reg as any).s_projects?.name || '',
      plotSize: reg.plot_size_sqyd as number | null,
      financials,
    }
  } catch (error: any) {
    console.error('Error fetching own sale lineage:', error)
    return { ...empty, error: error.message || 'Failed to load this sale.' }
  }
}

/** Marks one payout row as actually paid — the manual stub for real
 * disbursement. Sets processed_at to now; doesn't touch anyone else's
 * rows for the same registration (each payee's line is disbursed
 * independently, not all-or-nothing per sale). */
export async function markPayoutCompletedAction(payoutId: string) {
  try {
    const verified = await requireOperationManager()
    if (!verified.ok) return { success: false, error: verified.error }

    const supabaseAdmin = createServiceClient()
    const { data: payout } = await supabaseAdmin.from('s_sales_payouts').select('payout_status').eq('id', payoutId).single()
    if (!payout) return { success: false, error: 'Payout not found.' }
    if (payout.payout_status === 'completed') return { success: false, error: 'Already marked completed.' }

    const { error } = await supabaseAdmin
      .from('s_sales_payouts')
      .update({ payout_status: 'completed', processed_at: new Date().toISOString() })
      .eq('id', payoutId)

    if (error) throw error
    return { success: true, message: 'Payout marked as paid.' }
  } catch (error: any) {
    console.error('Error marking payout completed:', error)
    return { success: false, error: error.message || 'Failed to update payout.' }
  }
}

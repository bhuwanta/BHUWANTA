'use server'

// Server actions for the IT-only Payout Rules page — the configuration
// behind "who gets paid when someone sells" (S_payout_rules and
// S_realestate_users.earns_commission, migration 010).
//
// Auth deliberately mirrors admin/commission-rates/actions.ts rather
// than admin/modules/actions.ts: the modules actions have no auth checks
// at all and lean entirely on the page-level requireRole(), which is not
// good enough here. A Server Action is a directly POST-able endpoint
// regardless of which page rendered the button, and everything in this
// file moves real money.

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth'
import { isAdminPeer, isCommissionEligible, getSalesRoleOrder, ROLE_LABELS, type RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/permissions'
import { getUplineChain, getSubtreePendingSales } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/downline'
import { computeCommissionBreakdown, computePool, type CommissionRatesMap } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/commission'

type PayoutScope = 'chain' | 'company_wide' | 'director_assigned' | 'company_wide_split'

/** Only IT/CEO/Governing Council may read or change payout policy. The
 * page itself is IT-only (role/it/payout-rules), but keeping the check
 * at admin-peer level matches commission-rates and means adding the page
 * to another peer role later needs no change here. */
async function requireAdminPeer() {
  const caller = await verifyCaller()
  if (!caller || !isAdminPeer(caller.role)) {
    return { ok: false as const, error: 'Only IT, CEO, or Governing Council can manage payout rules.' }
  }
  return { ok: true as const, id: caller.id }
}

/** Non-sales roles that can still earn commission, in rank order above
 * the sales tiers. Sales-tier roles come from S_role_definitions. */
const NON_SALES_COMMISSION_ROLES: RealEstateRole[] = ['governing_council', 'ceo']

/** CEO/Governing Council's renamed labels (S_role_labels, migration
 * 011) — an absent row means "use the ROLE_LABELS static default",
 * same precedence as everywhere else a rename can override a built-in
 * name. Without this merge, a CEO→"Company" rename never showed up on
 * this page even though it worked everywhere else. */
async function getFixedRoleLabels(supabaseAdmin: ReturnType<typeof createServiceClient>): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin.from('s_role_labels').select('role_code, label')
  return new Map((data || []).map((r: any) => [r.role_code as string, r.label as string]))
}

/** Everything the page needs in one round trip: each commission-earning
 * role with its rate, its payout scope, and its active holders (so the
 * per-person "earns commission" switches can render without a second
 * fetch). */
export async function getPayoutRulesAction() {
  try {
    const verified = await requireAdminPeer()
    if (!verified.ok) return { success: false, error: verified.error, data: [] }

    const supabaseAdmin = createServiceClient()

    const [roleOrder, fixedLabels, { data: rulesData }, { data: ratesData }, { data: usersData }] = await Promise.all([
      getSalesRoleOrder(supabaseAdmin),
      getFixedRoleLabels(supabaseAdmin),
      supabaseAdmin.from('s_payout_rules').select('role_code, scope'),
      supabaseAdmin.from('s_commission_rates').select('role, percentage'),
      supabaseAdmin
        .from('s_realestate_users')
        .select('id, full_name, role, earns_commission')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
    ])

    const scopeByRole = new Map((rulesData || []).map((r: any) => [r.role_code as string, r.scope as PayoutScope]))
    const rateByRole = new Map((ratesData || []).map((r: any) => [r.role as string, Number(r.percentage)]))

    // Sales tiers in cascade order, then the non-sales earners above
    // them — same ordering the Roles / Commissions page presents.
    const orderedRoles: { role_code: string; label: string }[] = [
      ...roleOrder,
      ...NON_SALES_COMMISSION_ROLES.map((role) => ({ role_code: role, label: fixedLabels.get(role) || ROLE_LABELS[role] })),
    ]

    const data = orderedRoles.map((r) => ({
      role_code: r.role_code,
      label: r.label,
      percentage: rateByRole.get(r.role_code) ?? null,
      scope: scopeByRole.get(r.role_code) || ('chain' as PayoutScope),
      holders: (usersData || [])
        .filter((u: any) => u.role === r.role_code)
        .map((u: any) => ({ id: u.id as string, full_name: u.full_name as string, earns_commission: u.earns_commission !== false })),
    }))

    return { success: true, data }
  } catch (error: any) {
    console.error('Error fetching payout rules:', error)
    return { success: false, error: error.message || 'Failed to load payout rules.', data: [] }
  }
}

export async function setRoleScopeAction(roleCode: string, scope: PayoutScope) {
  try {
    const verified = await requireAdminPeer()
    if (!verified.ok) return { success: false, error: verified.error }

    if (scope !== 'chain' && scope !== 'company_wide' && scope !== 'director_assigned' && scope !== 'company_wide_split') {
      return { success: false, error: 'Invalid payout scope.' }
    }

    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin
      .from('s_payout_rules')
      .upsert({ role_code: roleCode, scope, updated_by: verified.id, updated_at: new Date().toISOString() }, { onConflict: 'role_code' })

    if (error) throw error

    return {
      success: true,
      message:
        scope === 'company_wide'
          ? 'Every active holder of this role now earns on every sale company-wide.'
          : scope === 'company_wide_split'
          ? "Every active holder earns on every sale company-wide, but this role's marginal cut is now split equally among all of them."
          : scope === 'director_assigned'
          ? 'Only the Governing Council member assigned to the selling Director now earns on that sale.'
          : "This role now only earns on sales made inside its own wing (the seller's parent chain).",
    }
  } catch (error: any) {
    console.error('Error setting role payout scope:', error)
    return { success: false, error: error.message || 'Failed to update payout scope.' }
  }
}

export async function setUserEarnsCommissionAction(userId: string, earns: boolean) {
  try {
    const verified = await requireAdminPeer()
    if (!verified.ok) return { success: false, error: verified.error }

    const supabaseAdmin = createServiceClient()

    const { data: target } = await supabaseAdmin.from('s_realestate_users').select('full_name, role').eq('id', userId).maybeSingle()
    if (!target) return { success: false, error: 'User not found.' }

    // Guard rather than silently writing a flag that means nothing — a
    // Customer or IT account never appears in a commission chain, so
    // toggling this for them would be misleading in the UI.
    if (!isCommissionEligible(target.role as RealEstateRole)) {
      return { success: false, error: 'This role never earns commission, so there is nothing to switch.' }
    }

    const { error } = await supabaseAdmin.from('s_realestate_users').update({ earns_commission: earns }).eq('id', userId)
    if (error) throw error

    return {
      success: true,
      message: earns
        ? `${target.full_name || 'This person'} will earn commission again on future sales.`
        : `${target.full_name || 'This person'} will no longer earn commission on future sales.`,
    }
  } catch (error: any) {
    console.error('Error setting earns_commission:', error)
    return { success: false, error: error.message || 'Failed to update this person.' }
  }
}

/** Dry-run of a sale by `sellerId`, against a nominal pool, so a change
 * can be checked BEFORE it costs anything on a real sale.
 *
 * Runs the actual production path — getUplineChain + computePool +
 * computeCommissionBreakdown, plus runCommissionPayout's zero-amount
 * filter — rather than reimplementing the math here, so the preview
 * can't drift away from what really gets written. */
const PREVIEW_POOL = 100000

export async function previewPayoutAction(sellerId: string) {
  try {
    const verified = await requireAdminPeer()
    if (!verified.ok) return { success: false, error: verified.error }

    const supabaseAdmin = createServiceClient()

    const { data: seller } = await supabaseAdmin.from('s_realestate_users').select('id, full_name, role').eq('id', sellerId).maybeSingle()
    if (!seller) return { success: false, error: 'Seller not found.' }

    const sellerRole = seller.role as RealEstateRole
    const uplineChain = await getUplineChain(supabaseAdmin, seller.id, sellerRole)

    const { data: ratesData } = await supabaseAdmin.from('s_commission_rates').select('role, percentage')
    const rates: CommissionRatesMap = {}
    ;(ratesData || []).forEach((r: any) => {
      rates[r.role as RealEstateRole] = Number(r.percentage)
    })

    // Same filter-then-zip ordering runCommissionPayout uses, so indices
    // stay aligned with the returned lines.
    const fullChain = [{ id: seller.id, role: sellerRole }, ...uplineChain]
    const eligibleChain = fullChain.filter((p) => rates[p.role] != null)
    if (eligibleChain.length === 0) {
      return { success: false, error: 'Nobody in this chain has a commission rate set — this sale would pay out nothing.' }
    }

    const pool = computePool(PREVIEW_POOL, 1)
    const lines = computeCommissionBreakdown(
      eligibleChain[0].role,
      eligibleChain.slice(1).map((c) => c.role),
      pool,
      rates
    )

    // Same 'company_wide_split' division runCommissionPayout applies
    // (payout-engine.ts) — otherwise this preview would show each CEO
    // earning the full marginal cut, which the real payout no longer
    // does once that role is split-scoped (migration 013).
    const { data: splitScopeRows } = await supabaseAdmin.from('s_payout_rules').select('role_code').eq('scope', 'company_wide_split')
    const splitRoles = new Set((splitScopeRows || []).map((r: any) => r.role_code as string))
    // Seller (index 0) excluded from the count and the division, same as
    // payout-engine.ts — see the comment there.
    const roleCounts = new Map<string, number>()
    eligibleChain.slice(1).forEach((c) => roleCounts.set(c.role, (roleCounts.get(c.role) || 0) + 1))
    const splitLines = lines.map((line, i) => {
      const n = roleCounts.get(line.role) || 1
      if (i === 0 || !splitRoles.has(line.role) || n <= 1) return line
      const rawAmountPaise = Math.round(line.rawAmount * 100) / n
      return { ...line, percentage: line.percentage / n, rawAmount: rawAmountPaise / 100, amount: Math.ceil(rawAmountPaise / 100) }
    })

    const ids = eligibleChain.map((c) => c.id)
    const { data: peopleData } = await supabaseAdmin.from('s_realestate_users').select('id, full_name').in('id', ids)
    const nameById = new Map((peopleData || []).map((p: any) => [p.id as string, p.full_name as string]))

    const payees = splitLines
      .map((line, i) => ({
        id: eligibleChain[i].id,
        full_name: nameById.get(eligibleChain[i].id) || 'Unknown',
        role: line.role,
        percentage: line.percentage,
        amount: line.amount,
        isSeller: eligibleChain[i].id === seller.id,
      }))
      .filter((p) => p.amount > 0)

    const totalAmount = payees.reduce((sum, p) => sum + p.amount, 0)

    return {
      success: true,
      data: {
        sellerName: seller.full_name as string,
        sellerRole,
        pool: PREVIEW_POOL,
        payees,
        totalAmount,
        totalPercentage: Math.round((totalAmount / PREVIEW_POOL) * 10000) / 100,
      },
    }
  } catch (error: any) {
    console.error('Error previewing payout:', error)
    return { success: false, error: error.message || 'Failed to preview this payout.' }
  }
}

/** The roles that can be previewed — the question this page answers is
 * "when a ROLE makes a sale, who earns?", so the picker is by role, not
 * by person.
 *
 * A real person is still needed underneath: wing-scoped roles are
 * resolved by walking actual parent_id links, so there's no chain to
 * walk without one. Each role therefore carries a representative holder,
 * preferring someone who actually sits under a parent so the preview
 * reflects a real wing rather than an orphaned account. Roles nobody
 * holds yet can't be previewed and are left out. */
export async function getPreviewRolesAction() {
  try {
    const verified = await requireAdminPeer()
    if (!verified.ok) return { success: false, error: verified.error, data: [] }

    const supabaseAdmin = createServiceClient()
    const [roleOrder, fixedLabels, { data: users }] = await Promise.all([
      getSalesRoleOrder(supabaseAdmin),
      getFixedRoleLabels(supabaseAdmin),
      supabaseAdmin.from('s_realestate_users').select('id, full_name, role, parent_id').eq('is_active', true).order('created_at', { ascending: true }),
    ])

    const labelOf = new Map<string, string>([
      ...roleOrder.map((r) => [r.role_code, r.label] as [string, string]),
      ...NON_SALES_COMMISSION_ROLES.map((r) => [r as string, fixedLabels.get(r) || ROLE_LABELS[r]] as [string, string]),
    ])

    const orderedCodes = [...roleOrder.map((r) => r.role_code), ...NON_SALES_COMMISSION_ROLES]

    const data = orderedCodes
      .map((roleCode) => {
        const holders = (users || []).filter((u: any) => u.role === roleCode)
        if (holders.length === 0) return null
        const representative = holders.find((h: any) => h.parent_id) || holders[0]
        return {
          role_code: roleCode,
          label: labelOf.get(roleCode) || roleCode,
          representativeId: representative.id as string,
          representativeName: representative.full_name as string,
          holderCount: holders.length,
        }
      })
      .filter(Boolean)

    return { success: true, data: data as { role_code: string; label: string; representativeId: string; representativeName: string; holderCount: number }[] }
  } catch (error: any) {
    console.error('Error loading preview roles:', error)
    return { success: false, error: error.message || 'Failed to load roles.', data: [] }
  }
}

/** One row per active Director plus their currently-assigned Governing
 * Council member (or null if never assigned — a gap the page surfaces
 * rather than hides), and the list of active GC members to assign from.
 * Only matters while governing_council's scope is 'director_assigned',
 * but returned unconditionally so the page can show the section as
 * informational even when scope is set back to chain/company_wide. */
export async function getDirectorGcAssignmentsAction(): Promise<{
  success: boolean
  error?: string
  directors: { directorId: string; directorName: string; gcId: string | null; gcName: string | null }[]
  gcMembers: { id: string; full_name: string }[]
}> {
  try {
    const verified = await requireAdminPeer()
    if (!verified.ok) return { success: false, error: verified.error, directors: [], gcMembers: [] }

    const supabaseAdmin = createServiceClient()
    const [{ data: directors }, { data: gcMembers }, { data: assignments }] = await Promise.all([
      supabaseAdmin.from('s_realestate_users').select('id, full_name').eq('role', 'director').eq('is_active', true).order('full_name', { ascending: true }),
      supabaseAdmin.from('s_realestate_users').select('id, full_name').eq('role', 'governing_council').eq('is_active', true).order('full_name', { ascending: true }),
      supabaseAdmin.from('s_director_gc').select('director_id, gc_id'),
    ])

    const gcByDirector = new Map((assignments || []).map((a: any) => [a.director_id as string, a.gc_id as string]))
    const gcNameById = new Map((gcMembers || []).map((g: any) => [g.id as string, g.full_name as string]))

    const directorRows = (directors || []).map((d: any) => {
      const gcId = gcByDirector.get(d.id) || null
      return {
        directorId: d.id as string,
        directorName: d.full_name as string,
        gcId,
        gcName: gcId ? gcNameById.get(gcId) || 'Unknown' : null,
      }
    })

    return {
      success: true,
      directors: directorRows,
      gcMembers: (gcMembers || []).map((g: any) => ({ id: g.id as string, full_name: g.full_name as string })),
    }
  } catch (error: any) {
    console.error('Error loading director-GC assignments:', error)
    return { success: false, error: error.message || 'Failed to load assignments.', directors: [], gcMembers: [] }
  }
}

/** Reassigns one Director to one Governing Council member — `director_id`
 * is the primary key on S_director_gc, so this upsert replaces rather
 * than adds, enforcing exactly one GC per Director at the DB level. */
export async function setDirectorGcAction(directorId: string, gcId: string) {
  try {
    const verified = await requireAdminPeer()
    if (!verified.ok) return { success: false, error: verified.error }

    const supabaseAdmin = createServiceClient()

    const [{ data: director }, { data: gc }] = await Promise.all([
      supabaseAdmin.from('s_realestate_users').select('full_name, role').eq('id', directorId).maybeSingle(),
      supabaseAdmin.from('s_realestate_users').select('full_name, role').eq('id', gcId).maybeSingle(),
    ])
    if (!director || director.role !== 'director') return { success: false, error: 'Director not found.' }
    if (!gc || gc.role !== 'governing_council') return { success: false, error: 'Governing Council member not found.' }

    // Blocked, not just warned: reassigning this Director changes which
    // Governing Council member gets paid on every sale from their WHOLE
    // wing (findUplineDirectorId + S_director_gc resolve GC per-sale off
    // the seller's own Director) — including sales already submitted but
    // not yet "Registration Done", since that's when the chain actually
    // gets walked and locked in, not at submission time. See
    // getSubtreePendingSales for the full reasoning.
    const pendingSales = await getSubtreePendingSales(supabaseAdmin, directorId)
    if (pendingSales.length > 0) {
      return {
        success: false,
        error: `Cannot reassign ${director.full_name || 'this Director'} right now — ${pendingSales.length} sale${pendingSales.length === 1 ? ' is' : 's are'} still pending in this wing. Resolve them first (customer payment + Registration Done), then reassign.`,
        pendingSales,
      }
    }

    const { error } = await supabaseAdmin
      .from('s_director_gc')
      .upsert({ director_id: directorId, gc_id: gcId, updated_by: verified.id, updated_at: new Date().toISOString() }, { onConflict: 'director_id' })

    if (error) throw error

    return { success: true, message: `${director.full_name || 'This Director'} is now assigned to ${gc.full_name || 'this Governing Council member'}.` }
  } catch (error: any) {
    console.error('Error setting director-GC assignment:', error)
    return { success: false, error: error.message || 'Failed to update this assignment.' }
  }
}

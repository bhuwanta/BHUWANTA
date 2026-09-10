// Shared s_realestate_users.parent_id tree-walking helpers — used by
// user-management (downline scoping, §4), the commission payout engine
// (upline chain, §3b), and the registrations/dashboard scoping for
// sales-tier pages (§8). Single source so the walk logic isn't
// reimplemented per caller.

import { createServiceClient } from '@/lib/supabase/server'
import { isSalesRole, getSalesRoleOrder, type RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'

type ServiceClient = ReturnType<typeof createServiceClient>

/** Walks parent_id downward from `rootId`, returning every descendant id
 * (the whole downline, not just direct reports) — HIERARCHY.md §4's
 * per-tier walling. Iterative BFS, not recursive SQL — the sales chain
 * is bounded (at most 8 tiers, Director→LIA). */
export async function getDownlineIds(supabaseAdmin: ServiceClient, rootId: string): Promise<string[]> {
  const ids: string[] = []
  let frontier = [rootId]
  while (frontier.length > 0) {
    const { data } = await supabaseAdmin.from('s_realestate_users').select('id').in('parent_id', frontier)
    const nextIds = (data || []).map((r: any) => r.id as string)
    ids.push(...nextIds)
    frontier = nextIds
  }
  return ids
}

export interface PendingSaleInfo {
  registrationId: string
  projectName: string
  areaName: string
  customerName: string
  sellerName: string
  submittedAt: string
  plotSizeSqyd: number
}

/** Every 'pending_registration' sale submitted by `rootId` or anyone in
 * their downline — the exact set whose eventual payout would change if
 * `rootId` (or someone above them) gets moved to a different upline
 * right now. runCommissionPayout only runs at "Registration Done" time
 * (registrations/actions.ts), walking whatever parent_id chain exists
 * AT THAT MOMENT — not a snapshot from when the customer originally
 * bought. So a reassignment made while a sale is still sitting
 * pending_registration would silently change who gets paid on a sale
 * that already happened, with no visible warning to anyone. Used to
 * BLOCK a "Reports To" / Director→GC reassignment outright rather than
 * let that happen — see reassignReportsToAction and setDirectorGcAction. */
export async function getSubtreePendingSales(supabaseAdmin: ServiceClient, rootId: string): Promise<PendingSaleInfo[]> {
  const downlineIds = await getDownlineIds(supabaseAdmin, rootId)
  const scopeIds = [rootId, ...downlineIds]

  const { data } = await supabaseAdmin
    .from('s_new_registrations')
    .select(
      `id, plot_size_sqyd, submitted_at, customer_name,
       s_projects ( name ),
       s_areas ( name ),
       seller:s_realestate_users!submitted_by ( full_name )`
    )
    .in('submitted_by', scopeIds)
    .eq('status', 'pending_registration')
    .order('submitted_at', { ascending: true })

  return (data || []).map((r: any) => ({
    registrationId: r.id as string,
    projectName: r.s_projects?.name || 'Unknown project',
    areaName: r.s_areas?.name || '',
    customerName: r.customer_name as string,
    sellerName: r.seller?.full_name || 'Unknown',
    submittedAt: r.submitted_at as string,
    plotSizeSqyd: Number(r.plot_size_sqyd),
  }))
}

/** Every role's payout scope, from S_payout_rules (migration 010/011). A
 * role with no row is treated as 'chain' — the restrictive default, so a
 * newly created role can never accidentally start being paid on every
 * sale company-wide before IT has said so. 'director_assigned'
 * (migration 011) is resolved through S_director_gc — only
 * governing_council uses it today; see the company-wide-append block in
 * getUplineChain below. */
export type PayoutScope = 'chain' | 'company_wide' | 'director_assigned' | 'company_wide_split'

async function getPayoutScopes(supabaseAdmin: ServiceClient): Promise<Map<string, PayoutScope>> {
  const { data } = await supabaseAdmin.from('s_payout_rules').select('role_code, scope')
  return new Map((data || []).map((r: any) => [r.role_code as string, r.scope as PayoutScope]))
}

/** Builds the list of people (besides the seller) who earn on a sale.
 * WHO is paid is policy read from S_payout_rules; HOW MUCH each of them
 * gets is computeCommissionBreakdown's job, off S_commission_rates.
 *
 * Two independent controls, both set from the IT-only Payout Rules page:
 *
 *  - Per role, `scope`. 'chain' means the role only earns when it
 *    actually sits in this seller's own parent_id upline — the wing rule
 *    (a Director is paid on their own wing's sales, not another
 *    Director's). 'company_wide' means every active holder earns on
 *    every sale regardless of wing, which is how Governing Council and
 *    CEO are seeded, since HIERARCHY.md §3b is explicit that "CEO's cut
 *    is computed on every sale" and parent_id can't encode that (a
 *    Director may literally have been created by IT rather than by GC).
 *
 *  - Per person, `earns_commission`. Lets one holder stop earning while
 *    keeping their role and access. Worth knowing for a 'chain' role:
 *    excluding the only holder of a tier doesn't delete that tier's
 *    share — the gap flows up to the next tier above them.
 *
 * The seller is always excluded by id: runCommissionPayout already puts
 * them at the head of the chain, and a second row for the same person
 * would violate migration 007's UNIQUE(registration_id, payee_id) and
 * abort the entire payout insert for that sale. */
export async function getUplineChain(
  supabaseAdmin: ServiceClient,
  sellerId: string,
  sellerRole: RealEstateRole
): Promise<{ id: string; role: RealEstateRole }[]> {
  const scopes = await getPayoutScopes(supabaseAdmin)
  const scopeOf = (role: string): PayoutScope => scopes.get(role) || 'chain'

  // The live sales-tier set, NOT the static SALES_RANK_ORDER array. That
  // array only knows the 8 built-in roles, so a role created via the
  // Roles/Commissions page (migration 008) failed isSalesRole(), broke
  // the walk at that ancestor, and silently truncated everyone above
  // them out of the payout. Also gives us each role's rank for ordering
  // the company-wide appends below.
  const roleOrder = await getSalesRoleOrder(supabaseAdmin)
  const salesRankOf = new Map(roleOrder.map((r, i) => [r.role_code, i]))
  const isChainWalkable = (role: string) => salesRankOf.has(role)

  const chain: { id: string; role: RealEstateRole }[] = []
  let currentId = sellerId

  while (true) {
    const { data: current } = await supabaseAdmin.from('s_realestate_users').select('parent_id').eq('id', currentId).single()
    if (!current?.parent_id) break

    const { data: parent } = await supabaseAdmin
      .from('s_realestate_users')
      .select('id, role, earns_commission')
      .eq('id', current.parent_id)
      .single()
    if (!parent || !isChainWalkable(parent.role as string)) break

    // Keep walking past someone who is skipped, rather than stopping —
    // their own upline is still in this seller's wing and still earns.
    // A 'company_wide' role is skipped here and picked up by the append
    // step instead, so it can never land in the chain twice.
    const skip = parent.earns_commission === false || scopeOf(parent.role as string) !== 'chain'
    if (!skip) {
      chain.push({ id: parent.id, role: parent.role as RealEstateRole })
    }
    currentId = parent.id
  }

  const seen = new Set<string>([sellerId, ...chain.map((c) => c.id)])

  // 'company_wide_split' (migration 013, e.g. CEO) is appended exactly
  // like 'company_wide' — every active holder still earns on every
  // sale. Only WHO earns is decided here; HOW MUCH each of several
  // holders keeps (divided equally for a split role) is payout-engine.ts's
  // job, applied after this chain is built.
  const companyWideRoles = [...scopes.entries()].filter(([, scope]) => scope === 'company_wide' || scope === 'company_wide_split').map(([role]) => role)

  for (const role of companyWideRoles) {
    const { data: holders } = await supabaseAdmin
      .from('s_realestate_users')
      .select('id')
      .eq('role', role)
      .eq('is_active', true)
      .eq('earns_commission', true)
      .order('created_at', { ascending: true })

    for (const holder of holders || []) {
      if (seen.has(holder.id)) continue
      seen.add(holder.id)
      chain.push({ id: holder.id, role: role as RealEstateRole })
    }
  }

  // 'director_assigned' (migration 011) — only governing_council has an
  // assignment table (S_director_gc) to resolve through today, unlike
  // the blanket company-wide loop above: find the SELLER'S OWN upline
  // Director (their own id if the seller already is one), then that one
  // Director's one assigned GC. A GC or CEO seller has no parent_id
  // (admin peers aren't in the downline tree), so findUplineDirectorId
  // correctly returns null for them and GC is skipped on their own
  // sale — same as it was already excluded from the seen set if they
  // happened to hold this role themselves. A Director created before
  // being assigned yields no row here — skipped rather than guessed,
  // and visible as a gap on the hierarchy visualizer.
  if (scopeOf('governing_council') === 'director_assigned') {
    const directorId = await findUplineDirectorId(supabaseAdmin, sellerId, sellerRole)
    if (directorId) {
      const { data: assignment } = await supabaseAdmin.from('s_director_gc').select('gc_id').eq('director_id', directorId).maybeSingle()
      if (assignment?.gc_id && !seen.has(assignment.gc_id)) {
        const { data: gcUser } = await supabaseAdmin
          .from('s_realestate_users')
          .select('id, is_active, earns_commission')
          .eq('id', assignment.gc_id)
          .maybeSingle()
        if (gcUser?.is_active && gcUser.earns_commission) {
          seen.add(gcUser.id)
          chain.push({ id: gcUser.id, role: 'governing_council' })
        }
      }
    }
  }

  // Order the WHOLE chain lowest tier first — not just the appended
  // part. computeCommissionBreakdown walks it expecting each tier to sit
  // above the one before, taking the gap between them; a role landing
  // out of order both floors its own line to 0% via clampNonNegative and
  // hands the next tier up an inflated gap. That is not hypothetical:
  // appending a mid-table role (a company-wide GM) after Director paid
  // GM nothing and paid Governing Council 8% instead of 2%.
  //
  // S_role_definitions.rank counts DOWN the hierarchy (Director is index
  // 0, LIA last), while the chain has to run UP it, so the sales index is
  // inverted here. Governing Council and CEO aren't in that table and sit
  // above every sales tier, in that order.
  const chainPosition = (role: string): number => {
    if (salesRankOf.has(role)) return roleOrder.length - salesRankOf.get(role)!
    if (role === 'governing_council') return roleOrder.length + 1
    if (role === 'ceo') return roleOrder.length + 2
    return roleOrder.length + 3
  }
  chain.sort((a, b) => chainPosition(a.role) - chainPosition(b.role))

  return chain
}

/** Finds the nearest Director in `personId`'s own chain — themselves if
 * they already are one, otherwise the first sales-tier ancestor with
 * role='director' walking up via parent_id. Used to gate "Registration
 * Done" (§3c/§8a — only the seller's own upline Director, not any
 * Director company-wide) and to resolve which Project(s) a non-Director
 * seller may pick from on the New Registration form (§5's "whole
 * downline inherits the Director's Project assignments"). Returns null
 * if no Director is found in the chain (shouldn't happen for a real
 * sales-tier account, but a caller should treat null as "no projects
 * available" rather than throwing). */
export async function findUplineDirectorId(supabaseAdmin: ServiceClient, personId: string, personRole: RealEstateRole): Promise<string | null> {
  if (personRole === 'director') return personId

  let currentId = personId
  while (true) {
    const { data: current } = await supabaseAdmin.from('s_realestate_users').select('parent_id').eq('id', currentId).single()
    if (!current?.parent_id) return null

    const { data: parent } = await supabaseAdmin.from('s_realestate_users').select('id, role').eq('id', current.parent_id).single()
    if (!parent) return null
    if (parent.role === 'director') return parent.id
    if (!isSalesRole(parent.role as RealEstateRole)) return null

    currentId = parent.id
  }
}

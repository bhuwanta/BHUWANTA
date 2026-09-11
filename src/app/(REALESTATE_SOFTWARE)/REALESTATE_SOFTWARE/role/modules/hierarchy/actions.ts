'use server'

// Lazy, level-by-level org-chart data for the hierarchy visualizer
// (role/hierarchy and role/payouts-visualize). The tree is: the Company
// account (role 'ceo', relabelled in migration 014 — the single root) ->
// Governing Council -> that GC's assigned Directors (S_director_gc,
// migration 011) -> the normal parent_id sales downline beneath each
// Director. A synthetic 'unassigned' node sits alongside the Governing
// Council members, surfacing any Director who was created but never
// assigned a GC (getUplineChain skips them rather than guessing — see
// downline.ts).
//
// Never fetches more than one level at a time: with 5k+ users, loading
// the whole tree up front is both slow and unreadable. Each call here
// answers exactly one question — "what are parentId's direct children,
// and does each of THOSE have children of its own" — so the client only
// ever pays for the nodes actually expanded on screen.

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { ROLE_LABELS, getSalesRoleOrder, type RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'

type ServiceClient = ReturnType<typeof createServiceClient>

export interface HierarchyNode {
  id: string
  full_name: string
  role: string
  roleLabel: string
  hasChildren: boolean
  /** Deactivated people are still drawn, greyed out. Hiding them made the
   * chart lie about the shape of the org — a whole wing could vanish
   * because one person in the middle was deactivated, and a deactivated
   * person could not be located at all. */
  is_active: boolean
}

// IT and Operation Manager both always have this: IT owns the plain
// hierarchy view, and Operation Manager gets the per-transaction
// "Visualize" button on the Payouts page
// (role/modules/payouts/PayoutsPage.tsx) — same read-only
// visibility isCanViewPayouts already grants them over the payout queue
// itself. Beyond those two, access is opt-in per role via the
// "Visualize Hierarchy" module (S_modules, module_key
// 'hierarchy_visualizer' — role/it/modules), same pattern as
// the User Management and Passwords modules: IT toggles which
// sales-tier roles get this, off by default. Note this check backs
// BOTH role/hierarchy (the plain org chart) and role/payouts-visualize
// (per-transaction) since they share this same node-loading action —
// the payout FIGURES themselves stay separately gated by
// requireCanViewPayouts (payouts/actions.ts), unaffected by this
// module, so a module-enabled sales role can browse the org structure
// but still can't see who got paid what on a sale.
async function requireCanViewHierarchy() {
  const caller = await verifyCaller()
  if (!caller) return { ok: false as const, error: 'Not authenticated.' }
  if (caller.role === 'it' || caller.role === 'operation_manager') return { ok: true as const }

  const supabaseAdmin = createServiceClient()
  const { data } = await supabaseAdmin.from('s_modules').select('enabled_roles').eq('module_key', 'hierarchy_visualizer').maybeSingle()
  const enabledRoles: string[] = (data?.enabled_roles as string[]) || []
  if (enabledRoles.includes(caller.role)) return { ok: true as const }

  return { ok: false as const, error: 'Only IT, Operation Manager, or a role enabled for the Visualize Hierarchy module can view this.' }
}

/** Combines the static ROLE_LABELS defaults with the two dynamic
 * override sources — S_role_definitions (sales-tier renames) and
 * S_role_labels (Company/Governing Council renames, migration 011) —
 * into one lookup, same precedence used everywhere else in this app:
 * dynamic override first, static default as the fallback. */
async function getLabelMap(supabaseAdmin: ServiceClient): Promise<Map<string, string>> {
  const [roleOrder, { data: fixedLabelRows }] = await Promise.all([
    getSalesRoleOrder(supabaseAdmin),
    supabaseAdmin.from('s_role_labels').select('role_code, label'),
  ])

  const map = new Map<string, string>(Object.entries(ROLE_LABELS))
  roleOrder.forEach((r) => map.set(r.role_code, r.label))
  ;(fixedLabelRows || []).forEach((r: any) => map.set(r.role_code as string, r.label as string))
  return map
}

/** Unauthenticated-caller-agnostic, UI-display-only check — same
 * pattern as checkUserManagementModuleStatusAction (user-management/
 * actions.ts): a sales-tier layout uses this to decide whether to show
 * a "Visualize Hierarchy" link at all. It is NOT the real access
 * control — requireCanViewHierarchy above (re-derived from the actual
 * session on every real data call) is. */
export async function checkHierarchyModuleStatusAction(role: RealEstateRole) {
  try {
    const supabaseAdmin = createServiceClient()
    const { data: moduleData } = await supabaseAdmin.from('s_modules').select('enabled_roles').eq('module_key', 'hierarchy_visualizer').maybeSingle()
    if (!moduleData) return { success: true, isEnabled: false }
    const isEnabled = ((moduleData.enabled_roles as string[]) || []).includes(role)
    return { success: true, isEnabled }
  } catch (error: any) {
    console.error('Error checking hierarchy module status:', error)
    return { success: false, isEnabled: false }
  }
}

/** One node's own display data (not its children) — needed when the
 * graph is rooted somewhere other than the Company, e.g. the wallet's
 * per-sale view, which roots the tree at the viewer themselves. */
export async function getHierarchyNodeAction(id: string): Promise<{ success: boolean; error?: string; node: HierarchyNode | null }> {
  try {
    const verified = await requireCanViewHierarchy()
    if (!verified.ok) return { success: false, error: verified.error, node: null }

    const supabaseAdmin = createServiceClient()
    const [labelMap, { data }] = await Promise.all([
      getLabelMap(supabaseAdmin),
      supabaseAdmin.from('s_realestate_users').select('id, full_name, role, is_active').eq('id', id).maybeSingle(),
    ])
    if (!data) return { success: false, error: 'Node not found.', node: null }

    const { count } = await supabaseAdmin.from('s_realestate_users').select('id', { count: 'exact', head: true }).eq('parent_id', id)

    return {
      success: true,
      node: {
        id: data.id as string,
        full_name: (data.full_name as string) || 'Unnamed',
        role: data.role as string,
        roleLabel: labelMap.get(data.role as string) || (data.role as string),
        hasChildren: (count || 0) > 0,
        is_active: (data as any).is_active !== false,
      },
    }
  } catch (error: any) {
    console.error('Error loading hierarchy node:', error)
    return { success: false, error: error.message || 'Failed to load this node.', node: null }
  }
}

/** Same check as checkHierarchyModuleStatusAction, but for the CALLER's
 * own real session role rather than a client-supplied one — used by the
 * Wallet page's Actions column, which has no other reason to know its
 * own role and shouldn't trust one passed in from the client anyway. */
export async function checkMyHierarchyModuleStatusAction() {
  const caller = await verifyCaller()
  if (!caller) return { success: false, isEnabled: false }
  if (caller.role === 'it' || caller.role === 'operation_manager') return { success: true, isEnabled: true }
  return checkHierarchyModuleStatusAction(caller.role)
}

const UNASSIGNED_NODE_ID = 'unassigned'

/** Returns the direct children of `parentId` (null for the root —
 * Company/CEO). Each child also carries `hasChildren`, resolved with a
 * handful of batched queries rather than one lookahead query per node,
 * so a screen full of siblings costs a constant number of round trips
 * regardless of how many there are. */
export async function getHierarchyChildrenAction(parentId: string | null): Promise<{ success: boolean; error?: string; nodes: HierarchyNode[] }> {
  try {
    const verified = await requireCanViewHierarchy()
    if (!verified.ok) return { success: false, error: verified.error, nodes: [] }

    const supabaseAdmin = createServiceClient()
    const labelMap = await getLabelMap(supabaseAdmin)

    let rawNodes: { id: string; full_name: string; role: string }[] = []
    let parentRole: string | null = null

    if (parentId === null) {
      const { data } = await supabaseAdmin
        .from('s_realestate_users')
        .select('id, full_name, role, is_active')
        .eq('role', 'ceo')
        .order('created_at', { ascending: true })
      rawNodes = data || []
    } else if (parentId === UNASSIGNED_NODE_ID) {
      const [{ data: directors }, { data: assigned }] = await Promise.all([
        supabaseAdmin.from('s_realestate_users').select('id, full_name, role, is_active').eq('role', 'director'),
        supabaseAdmin.from('s_director_gc').select('director_id'),
      ])
      const assignedIds = new Set((assigned || []).map((a: any) => a.director_id as string))
      rawNodes = (directors || []).filter((d: any) => !assignedIds.has(d.id))
    } else {
      const { data: parent } = await supabaseAdmin.from('s_realestate_users').select('role').eq('id', parentId).maybeSingle()
      if (!parent) return { success: false, error: 'Node not found.', nodes: [] }
      parentRole = parent.role as string

      if (parentRole === 'ceo') {
        const { data } = await supabaseAdmin
          .from('s_realestate_users')
          .select('id, full_name, role, is_active')
          .eq('role', 'governing_council')
          .order('created_at', { ascending: true })
        rawNodes = data || []
      } else if (parentRole === 'governing_council') {
        const { data: assignments } = await supabaseAdmin.from('s_director_gc').select('director_id').eq('gc_id', parentId)
        const directorIds = (assignments || []).map((a: any) => a.director_id as string)
        if (directorIds.length > 0) {
          const { data } = await supabaseAdmin
            .from('s_realestate_users')
            .select('id, full_name, role, is_active')
            .in('id', directorIds)
            .order('full_name', { ascending: true })
          rawNodes = data || []
        }
      } else {
        const { data } = await supabaseAdmin
          .from('s_realestate_users')
          .select('id, full_name, role, is_active')
          .eq('parent_id', parentId)
          .order('created_at', { ascending: true })
        rawNodes = data || []
      }
    }

    const hasChildrenMap = new Map<string, boolean>()

    const plainIds = rawNodes.filter((n) => n.role !== 'ceo' && n.role !== 'governing_council').map((n) => n.id)
    if (plainIds.length > 0) {
      const { data: childRows } = await supabaseAdmin.from('s_realestate_users').select('parent_id').in('parent_id', plainIds)
      const withChildren = new Set((childRows || []).map((r: any) => r.parent_id as string))
      plainIds.forEach((id) => hasChildrenMap.set(id, withChildren.has(id)))
    }

    // Company (the root) always has at least the Governing Council +
    // Unassigned slots to expand into, even when both are empty —
    // expanding reveals that emptiness rather than hiding the level
    // entirely.
    rawNodes.filter((n) => n.role === 'ceo').forEach((n) => hasChildrenMap.set(n.id, true))

    const gcIds = rawNodes.filter((n) => n.role === 'governing_council').map((n) => n.id)
    if (gcIds.length > 0) {
      const { data: assignRows } = await supabaseAdmin.from('s_director_gc').select('gc_id').in('gc_id', gcIds)
      const withDirectors = new Set((assignRows || []).map((r: any) => r.gc_id as string))
      gcIds.forEach((id) => hasChildrenMap.set(id, withDirectors.has(id)))
    }

    const nodes: HierarchyNode[] = rawNodes.map((n) => ({
      id: n.id,
      full_name: n.full_name || 'Unnamed',
      role: n.role,
      roleLabel: labelMap.get(n.role) || n.role,
      hasChildren: hasChildrenMap.get(n.id) || false,
      is_active: (n as any).is_active !== false,
    }))

    // The Unassigned-Directors bucket rides alongside Governing Council
    // members, one level below Company — only shown when there's
    // actually a gap to surface.
    if (parentRole === 'ceo') {
      const [{ data: directors }, { data: assigned }] = await Promise.all([
        supabaseAdmin.from('s_realestate_users').select('id').eq('role', 'director'),
        supabaseAdmin.from('s_director_gc').select('director_id'),
      ])
      const assignedIds = new Set((assigned || []).map((a: any) => a.director_id as string))
      const unassignedCount = (directors || []).filter((d: any) => !assignedIds.has(d.id)).length
      if (unassignedCount > 0) {
        nodes.push({
          id: UNASSIGNED_NODE_ID,
          full_name: `Unassigned Directors (${unassignedCount})`,
          role: 'unassigned',
          roleLabel: 'Not yet assigned',
          hasChildren: true,
          is_active: true,
        })
      }
    }

    return { success: true, nodes }
  } catch (error: any) {
    console.error('Error loading hierarchy children:', error)
    return { success: false, error: error.message || 'Failed to load hierarchy.', nodes: [] }
  }
}

/**
 * Everything needed to open the org chart focused on ONE person: their
 * ancestor path (so the graph can auto-expand straight down to them) and
 * the list of who sits above them, which is the readable answer to
 * "which wing is this person in?".
 *
 * Walks parent_id upward, exactly like getUplineChain does for payouts —
 * but this is a plain structural walk, deliberately NOT the payout chain:
 * it does not skip non-earning roles, does not apply payout scopes, and
 * does not append company-wide roles. Someone can be structurally above a
 * person without earning a rupee on their sales, and for "where does this
 * person sit" that is exactly what should be shown.
 *
 * The depth cap is a cycle guard. parent_id has no DB-level constraint
 * preventing a loop, and the reassignment UI is what currently keeps them
 * out (getReportsToCandidatesAction excludes the target's own downline).
 * A bad row must not hang the page.
 */
export async function getWingLineageAction(userId: string): Promise<{
  success: boolean
  error?: string
  /** Root-first ids to expand, ending at the user's parent. */
  expandPath: string[]
  /** Nearest-first: parent, grandparent, ... */
  ancestors: { id: string; full_name: string; role: string; roleLabel: string }[]
  self: { id: string; full_name: string; role: string; roleLabel: string; is_active: boolean } | null
  directReportCount: number
}> {
  const empty = { expandPath: [], ancestors: [], self: null, directReportCount: 0 }
  try {
    const verified = await requireCanViewHierarchy()
    if (!verified.ok) return { success: false, error: verified.error, ...empty }

    const supabaseAdmin = createServiceClient()
    const labelMap = await getLabelMap(supabaseAdmin)
    const shape = (r: any) => ({
      id: r.id as string,
      full_name: (r.full_name as string) || 'Unnamed',
      role: r.role as string,
      roleLabel: labelMap.get(r.role as string) || (r.role as string),
    })

    const { data: selfRow } = await supabaseAdmin
      .from('s_realestate_users')
      .select('id, full_name, role, parent_id, is_active')
      .eq('id', userId)
      .maybeSingle()
    if (!selfRow) return { success: false, error: 'User not found.', ...empty }

    const ancestors: { id: string; full_name: string; role: string; roleLabel: string }[] = []
    const seen = new Set<string>([userId])
    let cursor = selfRow.parent_id as string | null
    let depth = 0

    while (cursor && depth < 25) {
      if (seen.has(cursor)) break // cycle — stop rather than loop forever
      seen.add(cursor)
      const { data: parent } = await supabaseAdmin
        .from('s_realestate_users')
        .select('id, full_name, role, parent_id')
        .eq('id', cursor)
        .maybeSingle()
      if (!parent) break
      ancestors.push(shape(parent))
      cursor = parent.parent_id as string | null
      depth++
    }

    const { count } = await supabaseAdmin
      .from('s_realestate_users')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', userId)
      .eq('is_active', true)

    return {
      success: true,
      // ancestors is nearest-first; the graph expands from the root down.
      expandPath: ancestors.map((a) => a.id).reverse(),
      ancestors,
      self: { ...shape(selfRow), is_active: selfRow.is_active !== false },
      directReportCount: count || 0,
    }
  } catch (error: any) {
    console.error('Error loading wing lineage:', error)
    return { success: false, error: error.message || 'Failed to load lineage.', ...empty }
  }
}

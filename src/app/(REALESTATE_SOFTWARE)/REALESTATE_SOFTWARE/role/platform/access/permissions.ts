// Shared role/permission model for REALESTATE_SOFTWARE.
//
// Implements ../Doubts/HIERARCHY.md §2 (creation/management rights) and
// §4 (CEO-visibility exception). This is the single source of truth for
// "who can create/manage/see whom" — server actions should call these
// helpers rather than re-implementing role checks inline.
//
// NOT covered here: §4's per-tier downline walling (a Director only
// seeing their own Sr.Core-through-LIA team, not another Director's).
// That's instance-based (depends on the actual s_realestate_users.parent_id
// chain for a specific person), not a static role-pair rule, so it belongs
// in the data-fetching layer (a query scoped by parent_id / an upline walk),
// not in this file.

import type { createServiceClient } from '@/lib/supabase/server'

type ServiceClient = ReturnType<typeof createServiceClient>

export type RealEstateRole =
  | 'it'
  | 'ceo'
  | 'governing_council'
  | 'operation_manager'
  | 'director'
  | 'sr_core'
  | 'core'
  | 'gm'
  | 'agm'
  | 'rm'
  | 'lio'
  | 'lia'
  | 'customer';

// Admin peers (§2): IT, CEO, and Governing Council can create/manage any
// role, including each other. Not part of the sales downline tree.
// Operation Manager is deliberately NOT a peer — it's a standalone,
// narrower role (§7d): the sole company-wide approver for Registration
// Done and Payout completion, nothing else. It can't create/manage
// anyone, doesn't earn commission, and has no downline.
export const ADMIN_PEER_ROLES: readonly RealEstateRole[] = ['it', 'ceo', 'governing_council'];

export function isAdminPeer(role: RealEstateRole): boolean {
  return (ADMIN_PEER_ROLES as RealEstateRole[]).includes(role);
}

/** Only Operation Manager can click "Registration Done" (registrations)
 * or "Mark Paid" (payouts) — not Director, not IT/CEO/GC. A standing
 * rule referenced from both action files rather than repeating the
 * string comparison. */
export function isOperationManager(role: RealEstateRole): boolean {
  return role === 'operation_manager';
}

// Human-readable labels — single source so every page/component shows
// the same names (§1's rank-order table).
export const ROLE_LABELS: Record<RealEstateRole, string> = {
  it: 'IT Admin',
  // Static default only — the live label comes from S_role_labels
  // (migration 011), where this is set to "Company" (migration 014).
  ceo: 'CEO',
  governing_council: 'Governing Council',
  operation_manager: 'Operation Manager',
  // Sales tiers: static fallbacks only — the live names come from
  // S_role_definitions (migration 008) and are what every screen
  // actually renders. Kept in step with the live labels so the fallback
  // can never show retired terminology (sr_core was "Sr. Core", lio/lia
  // were "LIO"/"LIA").
  director: 'Director',
  sr_core: 'Deputy Director',
  core: 'Core',
  gm: 'GM',
  agm: 'AGM',
  rm: 'RM',
  lio: 'LO',
  lia: 'LA',
  customer: 'Customer',
};

// Sales-tier rank order, top to bottom (§1/§2) — the ORIGINAL 8
// built-in tiers only, kept as a static fallback/seed value (also what
// migration 008 seeds S_role_definitions with). This is no longer the
// live source of truth: a role created via the Commission Rates page
// (migration 008 / S_role_definitions) can rank anywhere in the sales
// cascade, including above Director, and won't appear in this array.
// Any code that needs the REAL, current order — which is everything
// that isn't operating on a hardcoded assumption — must use
// getSalesRoleOrder() below instead. Lower index = higher rank.
export const SALES_RANK_ORDER: readonly RealEstateRole[] = [
  'director',
  'sr_core',
  'core',
  'gm',
  'agm',
  'rm',
  'lio',
  'lia',
];

function salesRank(role: RealEstateRole): number {
  return SALES_RANK_ORDER.indexOf(role);
}

export function isSalesRole(role: RealEstateRole): boolean {
  return salesRank(role) !== -1;
}

/** A row from S_role_definitions — one sales-tier role (built-in or
 * admin-created), in cascade order. */
export interface SalesRoleOrderEntry {
  role_code: string;
  label: string;
}

/** The REAL, current sales-tier cascade order (migration 008) — reads
 * S_role_definitions ordered by rank, ascending (highest rank first,
 * same convention as SALES_RANK_ORDER). This is what every rank-aware
 * check and every UI ordering (Commission Rates, Payouts, Modules,
 * User Management's creatable-roles list) should use instead of the
 * static SALES_RANK_ORDER array, so a newly created role is correctly
 * ranked everywhere the moment it's created — no code change needed.
 * Server-side only (queries Postgres) — client components needing this
 * call the getSalesRoleOrderAction() wrapper in
 * admin/commission-rates/actions.ts instead. */
export async function getSalesRoleOrder(supabaseAdmin: ServiceClient): Promise<SalesRoleOrderEntry[]> {
  const { data, error } = await supabaseAdmin.from('s_role_definitions').select('role_code, label').order('rank', { ascending: true })
  if (error) {
    console.error('Error fetching sales role order, falling back to built-in order:', error)
    return SALES_RANK_ORDER.map((role) => ({ role_code: role, label: ROLE_LABELS[role] }))
  }
  return data || []
}

/** A single sales-tier role's current label — for the ~8 thin
 * role/<tier>/layout.tsx files, each of which needs just one role's
 * name for its sidebar header rather than the whole cascade. Reads the
 * same live S_role_definitions source as getSalesRoleOrder, so a rename
 * made on Roles/Commissions shows up in the sidebar immediately instead
 * of needing a code change (these layouts used to hardcode roleLabel as
 * a literal string, e.g. "LIA", which is exactly why a rename to "LA"
 * never appeared there). */
export async function getSalesRoleLabel(supabaseAdmin: ServiceClient, roleCode: RealEstateRole): Promise<string> {
  const roleOrder = await getSalesRoleOrder(supabaseAdmin)
  return roleOrder.find((r) => r.role_code === roleCode)?.label || ROLE_LABELS[roleCode] || roleCode
}

/** The same thing for one of the 5 FIXED roles (it/ceo/governing_council/
 * operation_manager/customer), which live in S_role_labels rather than
 * S_role_definitions — no rank concept for them. Used by the thin
 * role/<role>/layout.tsx shells that need one role's current name for
 * their sidebar header (e.g. ceo renders as "Company", migration 014)
 * instead of a hardcoded literal that a rename would never reach.
 * No row = the ROLE_LABELS static default, same precedence as
 * everywhere else. Server-side only. */
export async function getFixedRoleLabel(supabaseAdmin: ServiceClient, roleCode: RealEstateRole): Promise<string> {
  const { data } = await supabaseAdmin.from('s_role_labels').select('label').eq('role_code', roleCode).maybeSingle()
  return (data?.label as string) || ROLE_LABELS[roleCode] || roleCode
}

/** Dynamic counterpart to canCreateRole/canManageRole for the sales-tier
 * branch — takes the real, current rank order (from getSalesRoleOrder)
 * instead of assuming the static SALES_RANK_ORDER. Admin-peer callers
 * are unaffected (peers can create/manage anyone regardless of rank,
 * same as before) — only the sales-tier cascade comparison uses the
 * passed-in order. */
export function canCreateRoleDynamic(callerRole: RealEstateRole, targetRole: RealEstateRole, rankOrder: SalesRoleOrderEntry[]): boolean {
  // The top tier (ceo, labelled "Company" — migration 014) is a
  // singleton, created only by IT via a bespoke, existence-checked
  // branch in createExecutiveAction — never through this
  // general-purpose check, which would otherwise let Governing Council
  // (also an admin peer) create a second one.
  if (targetRole === 'ceo') return false
  if (isAdminPeer(callerRole)) {
    return true
  }
  const codes = rankOrder.map((r) => r.role_code)
  const callerRank = codes.indexOf(callerRole)
  const targetRank = codes.indexOf(targetRole)
  if (callerRank === -1 || targetRank === -1) return false
  return targetRank > callerRank
}

export const canManageRoleDynamic = canCreateRoleDynamic

/** Dynamic counterpart to isSalesRole — is this role_code present in
 * the real, current cascade (built-in or admin-created)? */
export function isSalesRoleDynamic(role: string, rankOrder: SalesRoleOrderEntry[]): boolean {
  return rankOrder.some((r) => r.role_code === role)
}

/** Dynamic counterpart to isCommissionEligible. */
export function isCommissionEligibleDynamic(role: RealEstateRole, rankOrder: SalesRoleOrderEntry[]): boolean {
  return isSalesRoleDynamic(role, rankOrder) || role === 'ceo' || role === 'governing_council'
}

// Commission-eligible roles (§3a) — the sales chain plus CEO and
// Governing Council. IT and Customer are never paid.
export function isCommissionEligible(role: RealEstateRole): boolean {
  return isSalesRole(role) || role === 'ceo' || role === 'governing_council';
}

/**
 * §2: can `callerRole` create/manage a profile with `targetRole`?
 *
 * - IT / CEO / Governing Council are peers: can create anyone, including
 *   each other.
 * - Director-through-LIA: strict downward cascade only — can create any
 *   role with a strictly lower rank (higher index in SALES_RANK_ORDER)
 *   than themselves. Never upward, never a peer at the same tier.
 * - Anything else (e.g. a sales role targeting an admin role, or
 *   Customer) is false.
 */
export function canCreateRole(callerRole: RealEstateRole, targetRole: RealEstateRole): boolean {
  if (isAdminPeer(callerRole)) {
    return true;
  }
  const callerRank = salesRank(callerRole);
  const targetRank = salesRank(targetRole);
  if (callerRank === -1 || targetRank === -1) return false;
  return targetRank > callerRank;
}

// §2's assumed rule: whatever a role can create, it can also
// edit/deactivate/delete. Same check — kept as a separate export for
// call-site clarity (createExecutiveAction vs. updateExecutiveAction, etc.).
export const canManageRole = canCreateRole;

/**
 * §4: is a profile with `subjectRole` visible to `viewerRole` at all?
 * The one role-level exception in this system: CEO is hidden from
 * Director-and-below, even though every other role is visible to anyone
 * who has reason to see it (subject to the separate downline-walling
 * check for sales roles, not covered here — see file header).
 */
export function canViewRole(viewerRole: RealEstateRole, subjectRole: RealEstateRole): boolean {
  if (subjectRole === 'ceo') {
    return isAdminPeer(viewerRole);
  }
  return true;
}

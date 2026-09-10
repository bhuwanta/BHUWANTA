'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { isAdminPeer, isOperationManager, isSalesRole, type RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'
import { PAGE_MODULES } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/page-modules'


/** Which roles a given module is allowed to govern. Anyone outside a
 * module's audience keeps the page unconditionally — IT above all, since
 * IT is the one configuring these and must never be able to lock itself
 * out of the Modules page it does it from. */
function isGovernedBy(moduleKey: string, roleCode: string): boolean {
  const role = roleCode as RealEstateRole
  if (role === 'it') return false
  switch (moduleKey) {
    // Sales-tier pages: admin peers and the Operation Manager keep them.
    case PAGE_MODULES.dashboard:
    case PAGE_MODULES.areasProjects:
    case PAGE_MODULES.settings:
    case PAGE_MODULES.myProjects:
      return isSalesRole(role)
    // Payouts has no sales-tier audience at all — it exists for the
    // company-wide oversight roles, so Company/Governing Council are
    // exactly who this one governs. Operation Manager keeps it: marking
    // a payout paid is their job (§7d).
    case PAGE_MODULES.payouts:
      return isAdminPeer(role) && !isOperationManager(role)
    case PAGE_MODULES.customerPayment:
    case PAGE_MODULES.customerDocuments:
    case PAGE_MODULES.customerRegistrationStatus:
    case PAGE_MODULES.customerContact:
    case PAGE_MODULES.customerSettings:
      return role === 'customer'

    // The modules that predate PAGE_MODULES, listed here so
    // requirePageModule works for ANY module key rather than silently
    // waving through the ones it doesn't recognise. Each keeps the
    // audience its own bespoke guard already enforced.
    case 'new_registration':
      // Company keeps the §7d exception: the one admin peer that sells.
      return isSalesRole(role)
    case 'registration_status':
    case 'wallet':
    case 'user_management':
    case 'passwords':
      return isSalesRole(role)
    // These two govern Company/Governing Council as well — only IT is
    // unconditionally exempt (already returned above).
    case 'hierarchy_visualizer':
    case 'bulk_password_reset':
      return isSalesRole(role) || (isAdminPeer(role) && !isOperationManager(role))

    default:
      return false
  }
}

/** Reads a module's enabled_roles. A missing row means "not configured
 * yet" and reads as ENABLED — these rows are only created the first time
 * IT opens the Modules page, and failing closed there would black out
 * pages nobody ever chose to disable. */
async function enabledRolesFor(moduleKeys: string[]): Promise<Record<string, string[] | null>> {
  const supabaseAdmin = createServiceClient()
  const { data } = await supabaseAdmin.from('s_modules').select('module_key, enabled_roles').in('module_key', moduleKeys)
  const out: Record<string, string[] | null> = {}
  for (const key of moduleKeys) out[key] = null
  for (const row of data || []) out[row.module_key as string] = (row.enabled_roles as string[]) || []
  return out
}

/** THE gate. Every guarded page and every page-scoped data action runs
 * this against the real session, never a client-supplied role. */
export async function requirePageModule(moduleKey: string) {
  const caller = await verifyCaller()
  if (!caller) return { ok: false as const, error: 'Not authenticated, or your account is inactive.' }
  if (!isGovernedBy(moduleKey, caller.role)) return { ok: true as const, caller }

  const enabled = (await enabledRolesFor([moduleKey]))[moduleKey]
  if (enabled === null) return { ok: true as const, caller }
  if (!enabled.includes(caller.role)) {
    return { ok: false as const, error: 'This page is not enabled for your role.' }
  }
  return { ok: true as const, caller }
}

/** Every page flag for the caller's own role in one round trip — the
 * layouts use this to decide which nav links to draw. Non-authoritative
 * by design: requirePageModule above is what actually protects a page. */
export async function getMyNavModulesAction(): Promise<Record<string, boolean>> {
  const caller = await verifyCaller()
  const keys = Object.values(PAGE_MODULES)
  if (!caller) return Object.fromEntries(keys.map((k) => [k, false]))

  const enabled = await enabledRolesFor(keys)
  return Object.fromEntries(
    keys.map((k) => {
      if (!isGovernedBy(k, caller.role)) return [k, true]
      const rows = enabled[k]
      return [k, rows === null ? true : rows.includes(caller.role)]
    })
  )
}

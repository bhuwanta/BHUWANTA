'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { getDownlineIds } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/org/downline'
import { ROLE_LABELS, getSalesRoleOrder } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'
import { requirePageModule } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/nav-modules'

/** §8: a sales-tier caller's own dashboard — their whole downline
 * (headcount by role) plus registration counts across themselves + that
 * downline. LIA has no downline, so usersByRole comes back empty and
 * the page just shows personal stats (§8h). Earnings reuse the existing
 * caller-scoped getMyEarningsAction from admin/dashboard/actions.ts —
 * no separate action needed, it already works for any commission-
 * eligible role. */
export async function getSalesDashboardStatsAction() {
  try {
    // Module gate: hiding the nav link isn't enough — a crafted
    // direct call to this action must fail the same way.
    const _mod = await requirePageModule('dashboard')
    if (!_mod.ok) return { success: false, error: _mod.error, usersByRole: [], registrationCounts: { pending_registration: 0, registration_done: 0, cancelled: 0 }, totalDownline: 0 } as any
    const caller = await verifyCaller()
    if (!caller) {
      return { success: false, downlineCount: 0, usersByRole: [], registrationCounts: { pending_registration: 0, registration_done: 0, cancelled: 0 }, totalRegistrations: 0, commissionPercentage: null as number | null }
    }

    const supabaseAdmin = createServiceClient()
    const downlineIds = await getDownlineIds(supabaseAdmin, caller.id)
    const scopeIds = [caller.id, ...downlineIds]

    const [usersRes, registrationsRes, rateRes] = await Promise.all([
      downlineIds.length > 0 ? supabaseAdmin.from('s_realestate_users').select('role').in('id', downlineIds) : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin.from('s_new_registrations').select('status').in('submitted_by', scopeIds),
      // The caller's own tier % (§3a) — their full rate on a sale they
      // close themselves, before any upline's marginal-difference cut.
      supabaseAdmin.from('s_commission_rates').select('percentage').eq('role', caller.role).maybeSingle(),
    ])

    const commissionPercentage = rateRes.data ? Number(rateRes.data.percentage) : null

    const usersByRoleMap: Record<string, number> = {}
    ;(usersRes.data || []).forEach((u: any) => {
      usersByRoleMap[u.role] = (usersByRoleMap[u.role] || 0) + 1
    })
    // Was a raw ROLE_LABELS[role] lookup — never touched the dynamic
    // sales-tier label source at all, so a rename on Roles / Commissions
    // never showed up here. dynamicLabels checked first, same precedence
    // as everywhere else (a built-in role already has a static
    // ROLE_LABELS entry, which would otherwise always shadow a rename).
    const salesRoleOrder = await getSalesRoleOrder(supabaseAdmin)
    const dynamicLabels = new Map(salesRoleOrder.map((r) => [r.role_code, r.label]))
    const usersByRole = Object.entries(usersByRoleMap).map(([role, count]) => ({
      role,
      label: dynamicLabels.get(role) || ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role,
      count,
    }))

    const registrationCounts = { pending_registration: 0, registration_done: 0, cancelled: 0 }
    ;(registrationsRes.data || []).forEach((r: any) => {
      if (r.status in registrationCounts) registrationCounts[r.status as keyof typeof registrationCounts]++
    })
    // Summed here, not in the client — SalesDashboard just renders this
    // number, it never adds the three counts itself.
    const totalRegistrations = registrationCounts.pending_registration + registrationCounts.registration_done + registrationCounts.cancelled

    return { success: true, downlineCount: downlineIds.length, usersByRole, registrationCounts, totalRegistrations, commissionPercentage }
  } catch (error: any) {
    console.error('Error fetching sales dashboard stats:', error)
    return { success: false, downlineCount: 0, usersByRole: [], registrationCounts: { pending_registration: 0, registration_done: 0, cancelled: 0 }, totalRegistrations: 0, commissionPercentage: null as number | null }
  }
}

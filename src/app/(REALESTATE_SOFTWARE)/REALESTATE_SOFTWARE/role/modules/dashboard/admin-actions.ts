'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { ROLE_LABELS, getSalesRoleOrder } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'
import { requirePageModule } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/nav-modules'

/** CEO/GC earn commission (§3a); IT doesn't, so IT's dashboard skips
 * this call entirely (see AdminDashboard.tsx). Deliberately takes no
 * userId parameter — earnings are always the verified caller's own, so
 * there's no client-suppliable id for one admin peer to pull another's
 * (e.g. IT reading CEO's commission) even via a direct Server Action
 * call bypassing the UI. */
export async function getMyEarningsAction() {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, totalEarned: 0, totalPaid: 0, totalPending: 0 }

    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
      .from('s_sales_payouts')
      .select('amount, payout_status')
      .eq('payee_id', caller.id)

    if (error) throw error

    const total = (data || []).reduce((sum: number, row: any) => sum + Number(row.amount), 0);
    const paid = (data || []).filter((r: any) => r.payout_status === 'completed').reduce((sum: number, row: any) => sum + Number(row.amount), 0);

    // Computed here so no client component ever subtracts these two
    // figures itself.
    return { success: true, totalEarned: total, totalPaid: paid, totalPending: total - paid };
  } catch (error: any) {
    console.error('Error fetching earnings:', error);
    return { success: false, totalEarned: 0, totalPaid: 0, totalPending: 0 };
  }
}

export async function getAdminDashboardStatsAction() {
  try {
    // Module gate: hiding the nav link isn't enough — a crafted
    // direct call to this action must fail the same way.
    const _mod = await requirePageModule('dashboard')
    if (!_mod.ok) return { totalUsers: 0, totalAreas: 0, totalProjects: 0, usersByRole: [], registrationCounts: { pending_registration: 0, registration_done: 0, cancelled: 0 }, commissionPercentage: null } as any
    const caller = await verifyCaller()
    const supabaseAdmin = createServiceClient()

    const [areasRes, projectsRes, doneRes, pendingRes, cancelledRes, rateRes] = await Promise.all([
      supabaseAdmin.from('s_areas').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('s_projects').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('s_new_registrations').select('id', { count: 'exact', head: true }).eq('status', 'registration_done'),
      supabaseAdmin.from('s_new_registrations').select('id', { count: 'exact', head: true }).eq('status', 'pending_registration'),
      supabaseAdmin.from('s_new_registrations').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
      // CEO/Governing Council's own tier % (§3a) — IT has no row in
      // S_commission_rates at all (not commission-eligible), so this
      // naturally resolves to null for IT without any special-casing.
      caller ? supabaseAdmin.from('s_commission_rates').select('percentage').eq('role', caller.role).maybeSingle() : Promise.resolve({ data: null }),
    ])

    const commissionPercentage = rateRes.data ? Number((rateRes.data as any).percentage) : null

    const registrationCounts = {
      pending_registration: pendingRes.count || 0,
      registration_done: doneRes.count || 0,
      cancelled: cancelledRes.count || 0,
    };

    // Present in a stable, meaningful order (admin peers first, then the
    // real sales-tier cascade top-to-bottom — built-in + any
    // admin-created roles, from S_role_definitions) rather than
    // whatever order the DB returns.
    const salesRoleOrder = await getSalesRoleOrder(supabaseAdmin)
    const roleOrder = ['it', 'ceo', 'governing_council', ...salesRoleOrder.map((r) => r.role_code), 'customer'];
    const dynamicLabels = new Map(salesRoleOrder.map((r) => [r.role_code, r.label]));
    // CEO/Governing Council's renamed labels (migration 011) — a direct
    // query rather than going through getFixedRoleLabelsAction, since
    // this is already server-side in the same request.
    const { data: fixedLabelRows } = await supabaseAdmin.from('s_role_labels').select('role_code, label')
    ;(fixedLabelRows || []).forEach((r: any) => dynamicLabels.set(r.role_code, r.label))

    // One exact-count query per role, head:true — NOT a bulk fetch of
    // every user's role column grouped client-side. Supabase's hosted
    // platform caps the ROWS a query body can return (1000 by default,
    // regardless of count:'exact' being requested), so past 1,000 total
    // users a bulk fetch silently truncates and undercounts whichever
    // roles' rows happen to sort past that cutoff — confirmed live: this
    // dashboard read "Total Users: 1000" against a real 1,093, and the
    // per-role breakdown was similarly short for the deepest sales
    // tiers. head:true requests return no body rows at all, so the cap
    // never applies; the count itself is still exact regardless of size.
    const roleCounts = await Promise.all(
      roleOrder.map((role) => supabaseAdmin.from('s_realestate_users').select('id', { count: 'exact', head: true }).eq('role', role))
    )
    const usersByRoleOrdered = roleOrder
      .map((role, i) => ({
        role,
        // dynamicLabels checked first — see the identical comment in
        // CommissionRatesPage.tsx's roleLabel(): the 8 built-in sales-tier
        // roles already have a static ROLE_LABELS entry, which would
        // otherwise always shadow a rename.
        label: dynamicLabels.get(role) || ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role,
        count: roleCounts[i].count || 0,
      }))
      .filter((r) => r.count > 0);

    const totalUsers = usersByRoleOrdered.reduce((sum, r) => sum + r.count, 0);

    return {
      success: true,
      totalUsers,
      usersByRole: usersByRoleOrdered,
      totalAreas: areasRes.count || 0,
      totalProjects: projectsRes.count || 0,
      registrationCounts,
      commissionPercentage,
    };
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return {
      success: false,
      totalUsers: 0,
      usersByRole: [],
      totalAreas: 0,
      totalProjects: 0,
      registrationCounts: { pending_registration: 0, registration_done: 0, cancelled: 0 },
      commissionPercentage: null as number | null,
    };
  }
}

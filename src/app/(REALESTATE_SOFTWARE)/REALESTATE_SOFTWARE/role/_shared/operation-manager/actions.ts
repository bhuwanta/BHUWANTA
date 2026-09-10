'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { isOperationManager } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'

/** §7d: Operation Manager's dashboard — a simple company-wide "what
 * needs my attention" view. No team, no commission, so no downline or
 * earnings sections like every other dashboard — just the two approval
 * queues this role exists to manage. */
export async function getOperationManagerDashboardStatsAction() {
  const empty = { success: false, pendingRegistrations: 0, pendingPayouts: 0, registrationsDone: 0, payoutsCompleted: 0 }
  try {
    const caller = await verifyCaller()
    if (!caller || !isOperationManager(caller.role)) return empty

    const supabaseAdmin = createServiceClient()
    const [pendingRegs, doneRegs, pendingPayouts, completedPayouts] = await Promise.all([
      supabaseAdmin.from('s_new_registrations').select('id', { count: 'exact', head: true }).eq('status', 'pending_registration'),
      supabaseAdmin.from('s_new_registrations').select('id', { count: 'exact', head: true }).eq('status', 'registration_done'),
      supabaseAdmin.from('s_sales_payouts').select('id', { count: 'exact', head: true }).in('payout_status', ['pending', 'processing']),
      supabaseAdmin.from('s_sales_payouts').select('id', { count: 'exact', head: true }).eq('payout_status', 'completed'),
    ])

    return {
      success: true,
      pendingRegistrations: pendingRegs.count || 0,
      registrationsDone: doneRegs.count || 0,
      pendingPayouts: pendingPayouts.count || 0,
      payoutsCompleted: completedPayouts.count || 0,
    }
  } catch (error: any) {
    console.error('Error fetching Operation Manager dashboard stats:', error)
    return empty
  }
}

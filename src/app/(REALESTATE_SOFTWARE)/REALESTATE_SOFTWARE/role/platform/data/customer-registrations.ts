'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { computePool } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/engines/payout/commission'

/** HIERARCHY.md §9: every Customer Dashboard section (Dashboard, Payment,
 * Registration Status, Contact) is really just a different view over the
 * same "my registrations" list — one query, scoped to the verified
 * caller's own customer_user_id, reused across all four pages. */
export async function getMyRegistrationsAction() {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, data: [] as any[], error: 'Not authenticated.' }
    if (caller.role !== 'customer') return { success: false, data: [] as any[], error: 'This page is for Customer accounts only.' }

    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
      .from('s_new_registrations')
      .select(`
        id, plot_size_sqyd, mrp_at_submission, status, payment_status,
        submitted_at, registration_done_at, cancelled_at, refund_status,
        payment_rejected_at, payment_rejection_note,
        s_areas ( name ),
        s_projects ( id, name, google_maps_url ),
        seller:s_realestate_users!submitted_by ( full_name, phone )
      `)
      .eq('customer_user_id', caller.id)
      .order('submitted_at', { ascending: false })

    if (error) throw error

    // What the customer owes (plot size × MRP) computed here, server-side
    // (reusing commission.ts's precise-decimal multiplication helper), so
    // no client component ever multiplies these two DB values itself.
    const withTotals = (data || []).map((reg: any) => ({
      ...reg,
      totalAmount: computePool(Number(reg.plot_size_sqyd), Number(reg.mrp_at_submission)),
    }))

    return { success: true, data: withTotals }
  } catch (error: any) {
    console.error('Error fetching my registrations:', error)
    return { success: false, data: [] as any[], error: error.message }
  }
}

'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { sendSetupPasswordEmail } from '@/lib/emails/resend'
import { isAdminPeer, isSalesRole, isOperationManager } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'
import { getDownlineIds, findUplineDirectorId } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/org/downline'
import { runCommissionPayout } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/engines/payout/payout-engine'
import { computeRatePerSqyd, computePool } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/engines/payout/commission'
import { requirePageModule } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/nav-modules'
import { requireCanViewRegistrations, requireCanCreateRegistration } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/registrations-access'
import { isMissingTableError, getVisiblePendingRegistrationIds } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/data/registrations-scope'
import { getSetPasswordUrl } from '@/lib/site-url'

/** Clears this user's Registrations badge by marking every pending
 * registration currently visible to them as read. Purely a per-user
 * notification acknowledgement — it does not change any registration's
 * status, doesn't approve anything, and doesn't affect anyone else's
 * badge (see the composite PK note in migration 006). */
export async function markRegistrationsReadAction() {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, error: 'Not authenticated.' }

    const supabaseAdmin = createServiceClient()
    const pendingIds = await getVisiblePendingRegistrationIds(supabaseAdmin, caller)
    if (pendingIds === null || pendingIds.length === 0) {
      return { success: true, message: 'Nothing to mark as read.' }
    }

    const rows = pendingIds.map((registrationId) => ({ user_id: caller.id, registration_id: registrationId }))
    // Upsert so re-marking an already-read row is a no-op rather than a
    // primary-key violation.
    const { error } = await supabaseAdmin.from('s_registration_reads').upsert(rows, { onConflict: 'user_id,registration_id' })
    if (error) {
      if (isMissingTableError(error)) {
        return { success: false, error: 'Read-tracking table missing — run Database/migration-006-registration-reads.sql first.' }
      }
      throw error
    }

    return { success: true, message: 'All caught up.' }
  } catch (error: any) {
    console.error('Error marking registrations read:', error)
    return { success: false, error: error.message || 'Failed to mark as read.' }
  }
}

/** Acknowledges ONE registration, dropping this user's badge count by
 * exactly one. Same per-user, status-neutral semantics as the
 * mark-all version above. */
export async function markOneRegistrationReadAction(registrationId: string) {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, error: 'Not authenticated.' }

    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin
      .from('s_registration_reads')
      .upsert({ user_id: caller.id, registration_id: registrationId }, { onConflict: 'user_id,registration_id' })

    if (error) {
      if (isMissingTableError(error)) {
        return { success: false, error: 'Read-tracking table missing — run Database/migration-006-registration-reads.sql first.' }
      }
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error marking registration read:', error)
    return { success: false, error: error.message || 'Failed to mark as read.' }
  }
}

/**
 * §7/§8: company-wide view for IT/CEO/GC and Operation Manager,
 * own-downline-only for a sales-tier caller (§4 walling — always
 * includes the caller's own submissions too, not just their
 * downline's). `canMarkDone` tells the client whether to show the
 * "Mark Done" action at all — true ONLY for Operation Manager (§7d).
 * Director and IT/CEO/GC see registrations read-only now; the approval
 * right was centralized to Operation Manager specifically so it's never
 * ambiguous who actually confirmed a registration.
 */
export async function getRegistrationsAction() {
  try {
    const verified = await requireCanViewRegistrations()
    if (!verified.ok) return { success: false, data: [], canMarkDone: false, companyWide: false, error: verified.error }
    const caller = verified.caller

    const supabaseAdmin = createServiceClient()

    let query = supabaseAdmin
      .from('s_new_registrations')
      .select(`
        id, plot_size_sqyd, base_price_at_submission, mrp_at_submission,
        customer_name, customer_phone, customer_email, status, payment_status,
        payment_rejected_at, payment_rejection_note,
        submitted_by, submitted_at,
        registration_done_by, registration_done_at,
        cancelled_at, refund_status,
        s_areas ( name ),
        s_projects ( name ),
        seller:s_realestate_users!submitted_by ( full_name, role )
      `)
      .order('submitted_at', { ascending: false })

    const canMarkDone = isOperationManager(caller.role)
    const companyWide = isAdminPeer(caller.role) || isOperationManager(caller.role)

    if (!companyWide) {
      if (!isSalesRole(caller.role)) {
        return { success: false, data: [], canMarkDone: false, companyWide: false, error: 'Not available for this role.' }
      }
      const downlineIds = await getDownlineIds(supabaseAdmin, caller.id)
      query = query.in('submitted_by', [caller.id, ...downlineIds])
    }

    const { data, error } = await query
    if (error) throw error

    // Tag each row with this user's own read state so the page can show
    // an unread dot and a per-row "mark read" control. Only pending rows
    // ever count toward the badge, so non-pending ones are reported as
    // read regardless.
    const rows = data || []
    let readIds = new Set<string>()
    const pendingIds = rows.filter((r: any) => r.status === 'pending_registration').map((r: any) => r.id as string)

    if (pendingIds.length > 0) {
      const { data: reads, error: readsError } = await supabaseAdmin
        .from('s_registration_reads')
        .select('registration_id')
        .eq('user_id', caller.id)
        .in('registration_id', pendingIds)

      // Migration 006 not applied yet — treat everything as unread
      // rather than failing the whole page load.
      if (readsError && !isMissingTableError(readsError)) throw readsError
      readIds = new Set((reads || []).map((r: any) => r.registration_id as string))
    }

    const withReadState = rows.map((r: any) => ({
      ...r,
      isRead: r.status !== 'pending_registration' || readIds.has(r.id),
      // What the customer owes/paid for this plot (plot size × MRP),
      // computed here rather than in the client — same rule the Customer
      // portal's own getMyRegistrationsAction already follows.
      totalAmount: computePool(Number(r.plot_size_sqyd), Number(r.mrp_at_submission)),
    }))

    return { success: true, data: withReadState, canMarkDone, companyWide }
  } catch (error: any) {
    console.error('Error fetching registrations:', error)
    return { success: false, data: [], canMarkDone: false, companyWide: false, error: error.message }
  }
}

/**
 * §3c step 8 / §7d: a single action that both records registration
 * completion and authorizes commission release, starting the 48h
 * payout clock. Authorized callers: Operation Manager, and ONLY
 * Operation Manager — not Director, not IT/CEO/GC. Centralizing this
 * to one role means it's never ambiguous who actually confirmed a
 * registration really happened. Gated on payment_status === 'paid'
 * (§3c: payment must precede Registration Done). Immediately runs the
 * §3b payout engine on success — see payout-engine.ts.
 */
export async function markRegistrationDoneAction(registrationId: string) {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, error: 'Not authenticated.' }
    if (!isOperationManager(caller.role)) {
      return { success: false, error: 'Only the Operation Manager can mark a registration done.' }
    }

    const supabaseAdmin = createServiceClient()

    const { data: registration, error: fetchError } = await supabaseAdmin
      .from('s_new_registrations')
      .select('status, submitted_by, payment_status')
      .eq('id', registrationId)
      .single()

    if (fetchError || !registration) {
      return { success: false, error: 'Registration not found.' }
    }
    if (registration.status !== 'pending_registration') {
      return { success: false, error: `This registration is already "${registration.status}" — cannot mark it done again.` }
    }
    if (registration.payment_status !== 'paid') {
      return { success: false, error: 'The customer has not completed payment yet.' }
    }

    // The two .eq()s above (status/payment_status) are the real guard,
    // not the read-then-check above — that read is only for a friendly
    // error message. Two concurrent "Mark Done" clicks (a double-click,
    // or two tabs) can both pass the read-side check before either
    // writes; without a condition on the UPDATE itself, both would then
    // proceed to runCommissionPayout() and every payee would be paid
    // twice for one sale. Postgres only lets one of two concurrent
    // UPDATEs matching the same row through as an actual row change —
    // the second one's WHERE no longer matches once the first commits,
    // so .select().maybeSingle() coming back empty here is the reliable
    // signal that this call lost the race, not a re-check of state
    // already read above.
    const { data: updated, error } = await supabaseAdmin
      .from('s_new_registrations')
      .update({
        status: 'registration_done',
        registration_done_by: caller.id,
        registration_done_at: new Date().toISOString(),
      })
      .eq('id', registrationId)
      .eq('status', 'pending_registration')
      .eq('payment_status', 'paid')
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!updated) {
      return { success: false, error: 'This registration was already marked done (possibly by another tab or user) — commission payouts were not duplicated.' }
    }

    const payoutResult = await runCommissionPayout(supabaseAdmin, registrationId)
    if (!payoutResult.success) {
      console.error('Payout computation failed after marking registration done:', payoutResult.error)
      return { success: true, message: `Registration marked done, but commission payout calculation failed (contact IT): ${payoutResult.error}` }
    }

    return { success: true, message: 'Registration marked done. Commission payouts have been calculated (rounded up to the nearest rupee) and scheduled within 48 hours.' }
  } catch (error: any) {
    console.error('Error marking registration done:', error)
    return { success: false, error: error.message || 'Failed to update registration.' }
  }
}

/**
 * Operation-Manager-only undo of "Registration Done" — reverts the sale
 * to pending_registration and removes the commission payouts that
 * marking it done generated.
 *
 * The hard rule: this is only safe while every payout line is still
 * unpaid. Once even one line is `completed`, real money has left the
 * company and is already showing in that person's Wallet as earned —
 * silently deleting it would make their wallet balance drop with no
 * trace, and there's no reversal mechanism for money already
 * disbursed. So a completed line blocks the undo outright rather than
 * being cleaned up; unwinding that is a deliberate finance decision for
 * IT/CEO/Governing Council, not a one-click action here.
 *
 * Payouts are deleted (not marked cancelled) because runCommissionPayout
 * recomputes them from scratch on the next "Mark Done", and the
 * UNIQUE(registration_id, payee_id) constraint from migration 007 would
 * otherwise reject those fresh rows.
 */
export async function undoRegistrationDoneAction(registrationId: string) {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, error: 'Not authenticated.' }
    if (!isOperationManager(caller.role)) {
      return { success: false, error: 'Only the Operation Manager can undo a registration.' }
    }

    const supabaseAdmin = createServiceClient()

    const { data: registration } = await supabaseAdmin
      .from('s_new_registrations')
      .select('status, customer_name')
      .eq('id', registrationId)
      .maybeSingle()

    if (!registration) return { success: false, error: 'Registration not found.' }
    if (registration.status !== 'registration_done') {
      return { success: false, error: 'Only a registration that is already marked done can be undone.' }
    }

    const { data: payoutRows, error: payoutFetchError } = await supabaseAdmin
      .from('s_sales_payouts')
      .select('id, payout_status')
      .eq('registration_id', registrationId)
    if (payoutFetchError) throw payoutFetchError

    const completedCount = (payoutRows || []).filter((p: any) => p.payout_status === 'completed').length
    if (completedCount > 0) {
      return {
        success: false,
        error: `${completedCount} commission payout${completedCount === 1 ? ' has' : 's have'} already been paid out for this sale, so it can no longer be undone here — contact IT, CEO, or Governing Council.`,
      }
    }

    // Conditional UPDATE is the real guard against two concurrent undos
    // (or an undo racing a Mark Done), exactly as in
    // markRegistrationDoneAction above — an empty result means this call
    // lost the race and must not go on to delete payout rows.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('s_new_registrations')
      .update({ status: 'pending_registration', registration_done_by: null, registration_done_at: null })
      .eq('id', registrationId)
      .eq('status', 'registration_done')
      .select('id')
      .maybeSingle()

    if (updateError) throw updateError
    if (!updated) {
      return { success: false, error: 'This registration changed while you were undoing it — reload and try again.' }
    }

    const { error: deleteError } = await supabaseAdmin.from('s_sales_payouts').delete().eq('registration_id', registrationId)
    if (deleteError) {
      console.error('Reverted registration status but failed to delete its payouts:', deleteError)
      return { success: false, error: 'Registration was reverted, but its commission payouts could not be removed — contact IT before marking it done again.' }
    }

    const removed = payoutRows?.length || 0
    return {
      success: true,
      message: `Registration for ${registration.customer_name || 'this customer'} reverted to pending${removed > 0 ? `, and ${removed} unpaid commission payout${removed === 1 ? '' : 's'} removed` : ''}.`,
    }
  } catch (error: any) {
    console.error('Error undoing registration done:', error)
    return { success: false, error: error.message || 'Failed to undo registration.' }
  }
}

/**
 * Operation-Manager-only undo of a payment confirmation — for when the
 * customer marked themselves paid but verification shows the money never
 * actually arrived.
 *
 * Blocked once the registration is done, because that state already
 * generated commission payouts off the back of this payment: undo the
 * registration first (above), which removes those payouts, then undo the
 * payment. Enforcing the order here keeps it impossible to end up with
 * live payouts attached to a sale that is no longer marked paid.
 */
export async function undoPaymentAction(registrationId: string, note: string) {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, error: 'Not authenticated.' }
    if (!isOperationManager(caller.role)) {
      return { success: false, error: 'Only the Operation Manager can undo a payment.' }
    }

    const trimmedNote = note?.trim()
    if (!trimmedNote) {
      return { success: false, error: 'Give a short reason — the customer sees this, so they know why their payment was reversed.' }
    }

    const supabaseAdmin = createServiceClient()

    const { data: registration } = await supabaseAdmin
      .from('s_new_registrations')
      .select('status, payment_status, customer_name')
      .eq('id', registrationId)
      .maybeSingle()

    if (!registration) return { success: false, error: 'Registration not found.' }
    if (registration.payment_status !== 'paid') {
      return { success: false, error: 'This registration is not marked paid, so there is nothing to undo.' }
    }
    if (registration.status === 'registration_done') {
      return { success: false, error: 'Undo the registration first — it was marked done based on this payment, and undoing that removes the commission payouts.' }
    }
    // A cancelled-but-paid sale already carries refund_status='pending'.
    // Reversing the payment there would leave a refund owed for a
    // payment that no longer exists — the refund is the correct
    // mechanism at that point, not this.
    if (registration.status === 'cancelled') {
      return { success: false, error: 'This registration is cancelled — its payment is handled through the pending refund, not by undoing it here.' }
    }

    // Conditional UPDATE, not the read above, is the real guard: it
    // pins both payment_status AND status, so a concurrent Mark Done or
    // cancel can't slip in between the read and this write.
    const { data: updated, error } = await supabaseAdmin
      .from('s_new_registrations')
      .update({
        payment_status: 'rejected',
        payment_rejected_by: caller.id,
        payment_rejected_at: new Date().toISOString(),
        payment_rejection_note: trimmedNote,
      })
      .eq('id', registrationId)
      .eq('payment_status', 'paid')
      .eq('status', 'pending_registration')
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!updated) {
      return { success: false, error: 'This registration changed while you were undoing it — reload and try again.' }
    }

    return { success: true, message: `Payment for ${registration.customer_name || 'this customer'} marked as not verified. They can re-confirm once it clears.` }
  } catch (error: any) {
    console.error('Error undoing payment:', error)
    return { success: false, error: error.message || 'Failed to undo payment.' }
  }
}

/** Same submission gate as createRegistrationAction below — only a
 * sales-tier caller (or CEO) can search customers. Company-wide (not
 * scoped to the caller): an old customer may have originally been
 * registered by a different seller. Partial match on phone OR email —
 * a minimum query length (3) keeps a stray 1-2 character search from
 * turning into a fishing expedition, and results are capped at 10.
 * `email` isn't a column on s_realestate_users (customers, like every
 * other account, only have it in Supabase Auth), so it's merged in from
 * listUsers() — the same pattern createRegistrationAction already uses
 * for its emailTaken check — rather than filtered in SQL. */
export async function searchCustomersAction(query: string) {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, error: 'Not authenticated.' }
    if (!isSalesRole(caller.role) && caller.role !== 'ceo') {
      return { success: false, error: 'Only sales-tier roles (and CEO) can search customers.' }
    }

    const trimmedQuery = query.trim().toLowerCase()
    if (trimmedQuery.length < 3) return { success: true, customers: [] as { id: string; full_name: string; phone: string; email: string; last_address: string }[] }

    const supabaseAdmin = createServiceClient()
    const { data: profiles } = await supabaseAdmin.from('s_realestate_users').select('id, full_name, phone').eq('role', 'customer')
    if (!profiles || profiles.length === 0) return { success: true, customers: [] }

    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    const emailById = new Map((authUsersData?.users || []).map((u: any) => [u.id, (u.email || '') as string]))

    const matches = profiles
      .map((p: any) => ({ id: p.id as string, full_name: p.full_name as string, phone: p.phone as string, email: emailById.get(p.id) || '' }))
      .filter((c: { phone: string; email: string }) => c.phone?.toLowerCase().includes(trimmedQuery) || c.email?.toLowerCase().includes(trimmedQuery))
      .slice(0, 10)

    if (matches.length === 0) return { success: true, customers: [] }

    // Last known address per matched customer — there's no address column
    // on s_realestate_users; customer_address is a per-registration
    // snapshot, so "their address" is whatever their most recent
    // registration recorded. Newest-first, and the Map keeps only the
    // first (newest) row seen per customer.
    const { data: addressRows } = await supabaseAdmin
      .from('s_new_registrations')
      .select('customer_user_id, customer_address, submitted_at')
      .in('customer_user_id', matches.map((c: { id: string }) => c.id))
      .order('submitted_at', { ascending: false })

    const lastAddressById = new Map<string, string>()
    for (const row of (addressRows || []) as any[]) {
      if (row.customer_address && !lastAddressById.has(row.customer_user_id)) {
        lastAddressById.set(row.customer_user_id, row.customer_address as string)
      }
    }

    const customers = matches.map((c: { id: string; full_name: string; phone: string; email: string }) => ({
      ...c,
      last_address: lastAddressById.get(c.id) || '',
    }))

    return { success: true, customers }
  } catch (error: any) {
    console.error('Error searching customers:', error)
    return { success: false, error: error.message || 'Failed to search customers.' }
  }
}

/**
 * §3c steps 1-5: the New Registration form submission. Only a
 * sales-tier caller (Director→LIA) can submit one. The Project must be
 * one actually assigned (directly or via Director-inheritance, §5) to
 * this seller's Director. Base Price/MRP are snapshotted at submission
 * time (§3d/§6), not read live later.
 *
 * An old customer is handled explicitly via `existingCustomerId`
 * (set by the New Registration form's "Old Customer" toggle,
 * populated from searchCustomersAction above) rather than silently
 * matching on a typed phone number — that silent-reuse behavior used to
 * live here and caused real confusion (an LIA had no visible way to
 * tell whether a submission created a new account or quietly reused an
 * existing one). When `existingCustomerId` is set, the profile is
 * re-fetched server-side rather than trusting client-supplied
 * name/phone/email for what is possibly a DIFFERENT seller's customer.
 */
export async function createRegistrationAction(input: {
  areaId: string
  projectId: string
  plotSizeSqyd: number
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  customerAddress?: string
  /** The final TOTAL amount the customer will pay for this plot — not a
   * ₹/sq.yd rate (that ambiguity is exactly what caused a 143.01 sq.yd
   * plot to get stored with a 22,88,160/sq.yd "rate" and a ₹32.7 crore
   * total). mrp_at_submission is stored as a rate for parity with
   * base_price_at_submission and because computePool() everywhere else
   * expects one, so this is converted to the equivalent rate below
   * rather than asking the caller to do that division themselves. */
  finalTotalAmount?: number
  existingCustomerId?: string
}) {
  try {
    // CEO can also submit a sale directly — the one admin peer allowed
    // to (§7d-style explicit exception, not the usual isAdminPeer
    // treatment of it/ceo/governing_council as equal; IT and Governing
    // Council still cannot submit a registration). A sales tier also
    // needs the New Registration module switched on for its role.
    const verified = await requireCanCreateRegistration()
    if (!verified.ok) return { success: false, error: verified.error }
    const caller = verified.caller

    if (!input.plotSizeSqyd || input.plotSizeSqyd <= 0) {
      return { success: false, error: 'Enter a valid plot size.' }
    }
    if (!input.existingCustomerId && (!input.customerName?.trim() || !input.customerPhone?.trim() || !input.customerEmail?.trim())) {
      return { success: false, error: 'Customer name, phone, and email are required.' }
    }

    const supabaseAdmin = createServiceClient()

    // CEO isn't in any Director's downline (parent_id is always NULL for
    // admin peers, §2), so there's no "assigned Project" concept to
    // check — CEO may sell any Project company-wide, same scope as
    // getMyProjectsAction gives them for the dropdown itself.
    if (caller.role === 'ceo') {
      const { data: projectExists } = await supabaseAdmin.from('s_projects').select('id').eq('id', input.projectId).maybeSingle()
      if (!projectExists) return { success: false, error: 'Project not found.' }
    } else {
      const directorId = await findUplineDirectorId(supabaseAdmin, caller.id, caller.role)
      if (!directorId) {
        return { success: false, error: 'No Director found in your chain — cannot determine which Projects you may sell.' }
      }

      const { data: assignment } = await supabaseAdmin
        .from('s_director_projects')
        .select('project_id')
        .eq('director_id', directorId)
        .eq('project_id', input.projectId)
        .maybeSingle()
      if (!assignment) {
        return { success: false, error: 'This Project is not assigned to your Director — you cannot sell it.' }
      }
    }

    const { data: project } = await supabaseAdmin.from('s_projects').select('id, area_id, base_price, mrp_default').eq('id', input.projectId).single()
    if (!project) return { success: false, error: 'Project not found.' }
    if (project.area_id !== input.areaId) return { success: false, error: 'Area/Project mismatch.' }
    if (project.base_price == null || Number(project.base_price) <= 0) {
      return { success: false, error: 'This project has no valid Base Price set yet — ask IT, CEO, or Governing Council to set one before submitting a sale.' }
    }

    const mrp = input.finalTotalAmount != null ? computeRatePerSqyd(input.finalTotalAmount, input.plotSizeSqyd) : project.mrp_default
    if (mrp == null || Number(mrp) <= 0) {
      return { success: false, error: 'No valid MRP set for this project — enter one, or ask IT/CEO/GC to set a default.' }
    }

    let customerUserId: string
    let finalCustomerName: string
    let finalCustomerPhone: string
    let finalCustomerEmail: string

    if (input.existingCustomerId) {
      // Returning customer, selected via the New Registration form's
      // "Old Customer" search (searchCustomersAction above).
      // Re-fetch server-side rather than trusting client-supplied
      // name/phone/email for what could be a different seller's
      // customer — the client only ever sent the id.
      const { data: existingProfile } = await supabaseAdmin.from('s_realestate_users').select('id, full_name, phone').eq('id', input.existingCustomerId).eq('role', 'customer').maybeSingle()
      if (!existingProfile) return { success: false, error: 'That customer could not be found — search again.' }

      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id)

      customerUserId = existingProfile.id
      finalCustomerName = existingProfile.full_name
      finalCustomerPhone = existingProfile.phone
      finalCustomerEmail = authData?.user?.email || ''
    } else {
      // New customer. A typed phone number that already belongs to an
      // existing customer is now a hard error rather than a silent
      // reuse — the seller should use "Old Customer" and search
      // for them instead, so it's always visible which one happened.
      const { data: existingCustomer } = await supabaseAdmin.from('s_realestate_users').select('id').eq('phone', input.customerPhone!).eq('role', 'customer').maybeSingle()
      if (existingCustomer) {
        return { success: false, error: 'This phone number already belongs to an existing customer — switch to Old Customer and search for them.' }
      }

      // Every Supabase Auth account (staff and customers alike) needs a
      // globally unique email — check upfront rather than letting the
      // create call fail, so the seller gets a clear, specific message
      // instead of a raw Auth API error string.
      const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      const emailTaken = (authUsersData?.users || []).some((u: any) => u.email?.toLowerCase() === input.customerEmail!.toLowerCase())
      if (emailTaken) {
        return { success: false, error: 'This email already exists — please use a different email for this customer.' }
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.customerEmail!,
        email_confirm: true,
        user_metadata: { full_name: input.customerName!, raw_phone: input.customerPhone! },
      })
      if (authError || !authData.user) {
        const isDuplicateEmail = /already|exist|registered/i.test(authError?.message || '')
        return {
          success: false,
          error: isDuplicateEmail
            ? 'This email already exists — please use a different email for this customer.'
            : `Could not create the customer's account: ${authError?.message || 'unknown error'}`,
        }
      }

      const { error: profileError } = await supabaseAdmin.from('s_realestate_users').insert({
        id: authData.user.id,
        phone: input.customerPhone!,
        full_name: input.customerName!,
        role: 'customer',
        parent_id: null,
        is_active: true,
      })
      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        if (profileError.code === '23505') {
          return { success: false, error: 'A customer with that phone number already exists.' }
        }
        return { success: false, error: `Could not create the customer's profile: ${profileError.message}` }
      }

      customerUserId = authData.user.id
      finalCustomerName = input.customerName!
      finalCustomerPhone = input.customerPhone!
      finalCustomerEmail = input.customerEmail!

      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: input.customerEmail!,
        options: { redirectTo: getSetPasswordUrl() },
      })
      if (linkData?.properties?.action_link) {
        await sendSetupPasswordEmail(input.customerEmail!, input.customerName!, linkData.properties.action_link)
      }
    }

    const { error: insertError } = await supabaseAdmin.from('s_new_registrations').insert({
      area_id: input.areaId,
      project_id: input.projectId,
      plot_size_sqyd: input.plotSizeSqyd,
      base_price_at_submission: project.base_price,
      mrp_at_submission: mrp,
      customer_name: finalCustomerName,
      customer_phone: finalCustomerPhone,
      customer_email: finalCustomerEmail,
      customer_address: input.customerAddress || null,
      submitted_by: caller.id,
      customer_user_id: customerUserId,
    })
    if (insertError) throw insertError

    return { success: true, message: 'Registration submitted. The Operation Manager will process it once the customer completes payment.' }
  } catch (error: any) {
    console.error('Error creating registration:', error)
    return { success: false, error: error.message || 'Failed to submit registration.' }
  }
}

/**
 * §3d: the seller or the customer can cancel any time before
 * Registration Done. If payment was already marked paid, this sets
 * refund_status to 'pending' (manual stub — no automated refund gateway
 * is wired up, §6's refund mechanics are still undesigned) rather than
 * processing anything automatically.
 */
export async function cancelRegistrationAction(registrationId: string) {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, error: 'Not authenticated.' }

    const supabaseAdmin = createServiceClient()
    const { data: registration } = await supabaseAdmin
      .from('s_new_registrations')
      .select('status, submitted_by, customer_user_id, payment_status')
      .eq('id', registrationId)
      .single()

    if (!registration) return { success: false, error: 'Registration not found.' }
    if (registration.status !== 'pending_registration') {
      return { success: false, error: 'This registration can no longer be cancelled.' }
    }

    const isSeller = registration.submitted_by === caller.id
    const isCustomer = registration.customer_user_id === caller.id
    if (!isSeller && !isCustomer && !isAdminPeer(caller.role)) {
      return { success: false, error: 'Not authorized to cancel this registration.' }
    }

    // Cancelling IS the customer's "I'm not paying" action — clicking ✕
    // instead of "Pay Now" declines the payment and ends the
    // registration. But once payment is actually marked paid, that door
    // closes for the customer and the seller: unwinding real money is an
    // admin decision, not a self-service one. IT/CEO/Governing Council
    // keep an override (which still records refund_status='pending' so
    // the money owed back stays visible).
    if (registration.payment_status === 'paid' && !isAdminPeer(caller.role)) {
      return { success: false, error: 'This registration has already been paid for and can no longer be cancelled here — contact IT, CEO, or Governing Council.' }
    }

    const refundStatus = registration.payment_status === 'paid' ? 'pending' : 'not_applicable'

    const { error } = await supabaseAdmin
      .from('s_new_registrations')
      .update({ status: 'cancelled', cancelled_by: caller.id, cancelled_at: new Date().toISOString(), refund_status: refundStatus })
      .eq('id', registrationId)
    if (error) throw error

    return {
      success: true,
      message: refundStatus === 'pending' ? 'Registration cancelled. A refund is now pending — contact IT/CEO/Governing Council to process it.' : 'Registration cancelled.',
    }
  } catch (error: any) {
    console.error('Error cancelling registration:', error)
    return { success: false, error: error.message || 'Failed to cancel registration.' }
  }
}

/** Customer-only: flips payment_status to 'paid' (§3c step 6's manual
 * stub — no payment gateway wired up, see the ADR note on this module's
 * README/HIERARCHY §6). Unlocks the Director's "Registration Done"
 * button, which itself is gated on payment_status === 'paid' above. */
export async function markPaymentPaidAction(registrationId: string) {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, error: 'Not authenticated.' }
    if (caller.role !== 'customer') return { success: false, error: 'Only the customer can confirm their own payment.' }
    // Confirming payment IS the Payment page's whole purpose, so the
    // action carries the same module gate the page does.
    const payGate = await requirePageModule('customer_payment')
    if (!payGate.ok) return { success: false, error: payGate.error }

    const supabaseAdmin = createServiceClient()
    const { data: registration } = await supabaseAdmin
      .from('s_new_registrations')
      .select('customer_user_id, status, payment_status')
      .eq('id', registrationId)
      .single()

    if (!registration) return { success: false, error: 'Registration not found.' }
    if (registration.customer_user_id !== caller.id) return { success: false, error: 'Not authorized.' }
    if (registration.status !== 'pending_registration') return { success: false, error: 'This registration is no longer pending.' }
    if (registration.payment_status === 'paid') return { success: false, error: 'Already marked as paid.' }

    // Conditional UPDATE rather than a bare .eq('id') — the read above
    // is only for friendly errors. Without pinning the current
    // payment_status here, a customer clicking "Pay Now" at the same
    // moment the Operation Manager undoes their payment could land
    // AFTER the undo and silently resurrect 'paid', with OM never
    // knowing. Re-confirming also clears the previous rejection so a
    // stale "not verified" note can't linger over a fresh payment.
    const { data: updated, error } = await supabaseAdmin
      .from('s_new_registrations')
      .update({
        payment_status: 'paid',
        payment_rejected_by: null,
        payment_rejected_at: null,
        payment_rejection_note: null,
      })
      .eq('id', registrationId)
      .eq('payment_status', registration.payment_status)
      .eq('status', 'pending_registration')
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!updated) {
      return { success: false, error: 'This registration changed while you were confirming — reload and try again.' }
    }

    return { success: true, message: 'Payment recorded. Your registration now moves to your Director for completion.' }
  } catch (error: any) {
    console.error('Error marking payment paid:', error)
    return { success: false, error: error.message || 'Failed to record payment.' }
  }
}

/** Permanently deletes a registration row from the database. Deliberately
 * IT-only — not the usual isAdminPeer check that treats it/ceo/
 * governing_council as equal peers everywhere else in this app. CEO and
 * Governing Council share this same company-wide Registrations page but
 * do NOT get this button; this is the one place those three roles
 * aren't equal, by explicit product decision, not an oversight.
 *
 * By default, blocked if the registration has any commission payout
 * rows against it (S_sales_payouts has no ON DELETE CASCADE on
 * registration_id, by design — real, possibly already-paid money should
 * never be silently deleted alongside a registration). Passing
 * `deletePayoutsToo: true` is an explicit, deliberate override: it
 * deletes every payout row for this registration first, THEN the
 * registration — an IT-only escape hatch for cleaning up test/bad data,
 * not something the UI reaches for without the caller having already
 * seen exactly how many payout rows (and how many are already marked
 * completed/paid) are about to be erased.
 */
export async function deleteRegistrationAction(registrationId: string, deletePayoutsToo: boolean = false) {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, error: 'Not authenticated.' }
    if (caller.role !== 'it') return { success: false, error: 'Only IT can delete a registration.' }

    const supabaseAdmin = createServiceClient()

    const { data: registration } = await supabaseAdmin
      .from('s_new_registrations')
      .select('id, customer_name, status')
      .eq('id', registrationId)
      .maybeSingle()
    if (!registration) return { success: false, error: 'Registration not found — it may already be deleted.' }

    const { data: payoutRows, error: payoutCheckError } = await supabaseAdmin
      .from('s_sales_payouts')
      .select('id, payout_status')
      .eq('registration_id', registrationId)
    if (payoutCheckError) throw payoutCheckError

    const payoutCount = payoutRows?.length || 0
    const completedCount = (payoutRows || []).filter((p: any) => p.payout_status === 'completed').length

    if (payoutCount > 0 && !deletePayoutsToo) {
      return {
        success: false,
        blockedByPayouts: true,
        payoutCount,
        completedCount,
        error: `This sale has ${payoutCount} commission payout${payoutCount === 1 ? '' : 's'} recorded against it${completedCount > 0 ? ` (${completedCount} already marked paid)` : ''}. Delete those payout records too?`,
      }
    }

    if (payoutCount > 0 && deletePayoutsToo) {
      const { error: deletePayoutsError } = await supabaseAdmin.from('s_sales_payouts').delete().eq('registration_id', registrationId)
      if (deletePayoutsError) throw deletePayoutsError
    }

    const { error } = await supabaseAdmin.from('s_new_registrations').delete().eq('id', registrationId)
    if (error) throw error

    return {
      success: true,
      message:
        payoutCount > 0
          ? `Deleted the registration for ${registration.customer_name || 'this customer'} and its ${payoutCount} payout record${payoutCount === 1 ? '' : 's'}.`
          : `Deleted the registration for ${registration.customer_name || 'this customer'}.`,
    }
  } catch (error: any) {
    console.error('Error deleting registration:', error)
    return { success: false, error: error.message || 'Failed to delete registration.' }
  }
}

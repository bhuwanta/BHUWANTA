'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth'
import { validatePassword } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/password-policy'
import { requirePageModule } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/nav-modules'

/** Self-service password change — every sales tier and Customer gets
 * this (§8/§9's "Settings" page, same pattern everywhere). Not the
 * admin-side force-reset-anyone tool (that's admin/settings/actions.ts,
 * IT/CEO/GC only) — this only ever touches the verified caller's own
 * account. */
export async function changeOwnPasswordAction(newPassword: string) {
  try {
    const caller = await verifyCaller()
    if (!caller) return { success: false, error: 'Not authenticated.' }

    // The page is gated, and so is the action behind it. A sales tier
    // needs both Settings (the page this lives on) and Passwords (the
    // feature itself); a Customer needs their own Settings module.
    // Without this a crafted call could still change a password for a
    // role whose Settings page is switched off.
    const settingsKey = caller.role === 'customer' ? 'customer_settings' : 'settings'
    const [pageOk, featureOk] = await Promise.all([
      requirePageModule(settingsKey),
      caller.role === 'customer' ? Promise.resolve({ ok: true as const, error: '' }) : requirePageModule('passwords'),
    ])
    if (!pageOk.ok) return { success: false, error: pageOk.error }
    if (!featureOk.ok) return { success: false, error: 'Password changes are not enabled for your role.' }

    const passwordError = validatePassword(newPassword)
    if (passwordError) return { success: false, error: passwordError }

    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(caller.id, { password: newPassword })
    if (error) throw error

    return { success: true, message: 'Password updated successfully.' }
  } catch (error: any) {
    console.error('Error changing own password:', error)
    return { success: false, error: error.message || 'Failed to update password.' }
  }
}

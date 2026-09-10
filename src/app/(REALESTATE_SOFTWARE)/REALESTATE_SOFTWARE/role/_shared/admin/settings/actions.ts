'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth'
import { isAdminPeer } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/permissions'
import { validatePassword } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/password-policy'

/**
 * Force-reset a user's password by email. Fixed version of the original
 * `resetPasswordByEmailAction` (HIERARCHY.md §10 item 7 / §7 IT settings
 * row) — the old implementation queried `s_realestate_users.email`, a
 * column that has never existed on that table (email lives only in
 * Supabase `auth.users`), so it always failed. This version looks the
 * user up via the Auth Admin API instead, the same pattern already used
 * successfully by `getExecutivesAction` for displaying emails.
 */
export async function resetPasswordByEmailAction(email: string, newPassword: string) {
  try {
    // This page (SettingsPage.tsx) only renders for it/ceo/governing_council
    // (the middleware role check per URL segment already blocks anyone
    // else from reaching it), but that's the only thing standing in the
    // way today — re-verifying the real caller here too so this action
    // stays safe on its own even if it's ever reused from a page with a
    // different guard.
    const caller = await verifyCaller()
    if (!caller || !isAdminPeer(caller.role)) {
      return { success: false, error: 'Not authorized.' }
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) return { success: false, error: passwordError }

    const supabaseAdmin = createServiceClient()

    // Supabase's admin listUsers doesn't take an email filter directly in
    // all client versions, so page through and match — bounded by
    // perPage, fine for this system's scale.
    const { data: authUsersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (listError) {
      console.error('Error listing users:', listError)
      return { success: false, error: 'Could not look up users.' }
    }

    const targetEmail = email.trim().toLowerCase()
    const matchedAuthUser = authUsersData.users.find((u: any) => u.email?.toLowerCase() === targetEmail)

    if (!matchedAuthUser) {
      return { success: false, error: 'User with this Email not found. Please check and try again.' }
    }

    const { data: profile } = await supabaseAdmin
      .from('s_realestate_users')
      .select('full_name, role')
      .eq('id', matchedAuthUser.id)
      .maybeSingle()

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(matchedAuthUser.id, {
      password: newPassword
    })

    if (updateError) {
      console.error('Error updating password:', updateError)
      return { success: false, error: updateError.message }
    }

    const displayName = profile?.full_name || matchedAuthUser.email
    const displayRole = profile?.role ? String(profile.role).replace('_', ' ') : 'unknown role'

    return {
      success: true,
      message: `Successfully reset password for ${displayName} (${displayRole})`
    }
  } catch (error: any) {
    console.error('Server action error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

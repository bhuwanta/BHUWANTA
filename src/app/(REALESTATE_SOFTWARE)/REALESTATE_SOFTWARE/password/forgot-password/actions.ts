'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { sendRecoveryEmail } from '@/lib/emails/resend'

export async function sendRecoveryEmailAction(email: string) {
  try {
    const supabaseAdmin = createServiceClient()

    // 1. Verify user exists
    // perPage explicit — Supabase's default listUsers() page is only 50
    // users, so past that count this would silently miss real accounts
    // and fall through to the "pretend it succeeded" branch below,
    // meaning forgot-password would quietly stop working for anyone
    // created after the first 50. Matches the same perPage:1000 pattern
    // already used by resetPasswordByEmailAction and getExecutivesAction.
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (userError) {
      console.error('Error listing users:', userError)
      return { success: false, error: 'Service temporarily unavailable' }
    }

    const userExists = users.users.find((u: any) => u.email === email)
    if (!userExists) {
      // For security, do not reveal if the user exists or not.
      // Just pretend it succeeded.
      return { success: true }
    }

    // 2. Generate recovery link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://bhuwanta.com'}/REALESTATE_SOFTWARE/password/set-password`
      }
    })

    if (linkError) {
      console.error('Error generating recovery link:', linkError)
      return { success: false, error: 'Failed to generate recovery link' }
    }

    const actionLink = linkData.properties?.action_link
    if (!actionLink) {
      return { success: false, error: 'Action link missing' }
    }

    // 3. Send email
    const { success, error } = await sendRecoveryEmail(email, actionLink)
    if (!success) {
      return { success: false, error: error || 'Failed to send recovery email' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Server action error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

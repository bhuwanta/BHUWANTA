'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (data?.user?.user_metadata?.is_disabled) {
    await supabase.auth.signOut()
    return { error: 'This account has been disabled by the administrator.' }
  }

  // CRM membership is the `profiles` table, not "has an auth account".
  //
  // Both portals sign in against the same Supabase auth project on purpose —
  // one person may legitimately hold both a CRM and a BDCP account on the same
  // email, and which portal they land in is decided by where they logged in.
  // But that only works if each portal checks its OWN membership table.
  //
  // Without this check any of the ~1,000 BDCP accounts could sign in here with
  // their normal password, and because BDCP profiles carry no
  // user_metadata.role, the `user_metadata?.role || 'Admin'` default further
  // down would hand them CRM Admin.
  const supabaseAdmin = createServiceClient()
  const { data: crmProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!crmProfile) {
    await supabase.auth.signOut()
    return { error: 'This account does not have CRM access.' }
  }

  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  cookieStore.set('crm_access_granted', '1', {
    path: '/crm',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  })

  if (data?.user?.user_metadata?.role === 'Telecaller') {
    redirect('/crm/leads')
  } else {
    redirect('/crm')
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  cookieStore.delete('crm_access_granted')

  redirect('/crm')
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required' }
  }

  const supabaseAdmin = createServiceClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  // 1. Generate recovery link (bypasses Supabase email rate limits)
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: email,
    options: {
      redirectTo: `${siteUrl}/crm/update-password`,
    }
  })

  if (linkError) {
    console.error('Error generating recovery link:', linkError)
    // Pretend it succeeded if user doesn't exist for security
    if (linkError.message.includes('User not found')) {
      return { success: true }
    }
    return { error: linkError.message }
  }

  const actionLink = linkData.properties?.action_link
  if (!actionLink) {
    return { error: 'Failed to generate reset link' }
  }

  // 2. Send email via Resend
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'info@bhuwanta.com'
  const logoUrl = `${siteUrl}/logo.png`

  try {
    const { error: resendError } = await resend.emails.send({
      from: `Bhuwanta CRM <${fromEmail}>`,
      to: email,
      subject: 'Reset your Bhuwanta CRM Password',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e8ecf2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #0f1d33; padding: 24px; text-align: center;">
            <img src="${logoUrl}" alt="Bhuwanta" style="height: 48px; width: auto; margin-bottom: 16px;" onerror="this.style.display='none'" />
            <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Password Reset Request</h2>
          </div>
          
          <div style="padding: 32px 24px;">
            <p style="color: #5a6a82; font-size: 16px; line-height: 1.5; margin-top: 0; margin-bottom: 24px;">
              We received a request to reset the password for your <strong>Bhuwanta CRM</strong> account.
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${actionLink}" style="background-color: #c4a55a; color: #ffffff; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block;">
                Reset My Password
              </a>
            </div>

            <p style="color: #8c9bad; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
              If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
            </p>
          </div>
          
          <div style="background-color: #f8fafc; border-top: 1px solid #e8ecf2; padding: 16px 24px; text-align: center;">
            <p style="color: #8c9bad; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Bhuwanta. All rights reserved.
            </p>
          </div>
        </div>
      `
    })

    if (resendError) {
      console.error('Error sending reset email:', resendError)
      return { error: 'Failed to send reset email' }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Email error:', err)
    return { error: 'Failed to send reset email' }
  }
}

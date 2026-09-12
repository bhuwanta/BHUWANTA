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

  if (data?.user?.user_metadata?.role === 'Telecaller') {
    redirect('/crm/leads')
  } else {
    redirect('/crm')
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/crm')
}

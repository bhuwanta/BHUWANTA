'use server'

import { createClient } from '@supabase/supabase-js'
import { sendUserCredentials } from '@/lib/resend'

export async function addAdminUser(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string || 'Admin'
  const name = formData.get('name') as string || ''

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  // Use the service role key to bypass RLS and create users without signing in
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // 1. First create the user with a role allowed by the profiles table check constraint
  // The profiles table only allows: 'Admin', 'Sales Manager', 'Sales Executive'
  // If we pass 'Telecaller' during creation, the database trigger might fail on the check constraint
  const tempRole = role === 'Telecaller' ? 'Sales Executive' : role;
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: tempRole, full_name: name }
  })

  if (error) {
    return { error: error.message }
  }

  // 2. Now update the user metadata to the actual role (e.g. Telecaller) in auth.users
  if (data?.user && role !== tempRole) {
    await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      user_metadata: { role: role, full_name: name }
    })
  }

  // 3. Write the profiles row. Upsert, not update.
  //
  // This used to UPDATE, assuming the on_auth_user_created trigger in
  // supabase/schema.sql had already inserted the row. That trigger is not live
  // — profiles holds a single row against 1,000+ auth users — so the UPDATE
  // matched nothing and the miss was merely logged, leaving CRM users with an
  // auth account and no profiles row.
  //
  // That was harmless while nothing checked membership. Now that `profiles` is
  // what grants CRM access, a missing row means the account cannot log in, so
  // this has to create the row rather than assume something else did.
  if (data?.user) {
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: data.user.id, email, role: role, name: name }, { onConflict: 'id' })

    if (updateError) {
      // Now fatal: without this row the account exists in auth but has no CRM
      // access, which is a confusing half-created user. Roll the auth user back
      // so the admin can correct the input and retry cleanly.
      console.error('Failed to write profiles row, rolling back auth user:', updateError.message)
      await supabaseAdmin.auth.admin.deleteUser(data.user.id)
      return { error: `Could not grant CRM access: ${updateError.message}` }
    }

    // Send credentials email
    const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bhuwanta.com'}/crm/login`
    await sendUserCredentials(email, name, role, password, loginUrl)
  }

  return { success: true, user: data.user }
}

export async function listAdminUsers() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Driven by `profiles` — the CRM's own membership table — not by
  // auth.admin.listUsers().
  //
  // Both portals share one Supabase auth project, and every BDCP profile is
  // backed by an auth user, so listUsers() returned all ~1,000 BDCP people
  // alongside the handful of real CRM users. Auth is still read, but only to
  // enrich the accounts `profiles` already names.
  const { data: crmProfiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, name, created_at')
    .order('created_at', { ascending: true })

  if (profilesError) {
    return { error: profilesError.message }
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers()

  if (error) {
    return { error: error.message }
  }

  const authById = new Map(data.users.map((u) => [u.id, u]))

  return {
    success: true,
    users: (crmProfiles || []).map((p) => {
      const u = authById.get(p.id)
      return {
        id: p.id,
        email: p.email || u?.email,
        // profiles.created_at as the fallback: a profiles row whose auth user
        // is missing is a broken account, but it should still be listed so an
        // admin can see and remove it rather than have it silently disappear.
        created_at: u?.created_at ?? p.created_at ?? '',
        last_sign_in_at: u?.last_sign_in_at,
        is_disabled: u?.user_metadata?.is_disabled || false,
        // profiles.role is the CRM's own record; user_metadata is the copy the
        // middleware reads, so fall back to it rather than assuming 'admin'.
        role: p.role || u?.user_metadata?.role || 'admin',
        name: p.name || u?.user_metadata?.full_name || '',
      }
    }),
  }
}

export async function deleteAdminUser(id: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function changeAdminPassword(formData: FormData) {
  const id = formData.get('id') as string
  const password = formData.get('password') as string
  if (!id || !password) return { error: 'ID and new password are required' }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password })
  if (error) return { error: error.message }
  return { success: true }
}

export async function toggleAdminStatus(id: string, disable: boolean) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { is_disabled: disable }
  })
  if (error) return { error: error.message }
  return { success: true }
}

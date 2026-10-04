'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

import { validatePassword } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/policies/password-policy'

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'Both fields are required' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const validationError = validatePassword(password)
  if (validationError) {
    return { error: validationError }
  }

  const supabase = await createClient()

  // Verify the user is authenticated (they should be, from the magic link)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'You must be logged in via a reset link to change your password. The link may have expired.' }
  }

  // Update password
  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    return { error: error.message }
  }

  // Force them to sign in again with the new password
  await supabase.auth.signOut()
  redirect('/crm/login')
}

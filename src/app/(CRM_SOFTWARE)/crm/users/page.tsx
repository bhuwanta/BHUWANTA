import { createClient } from '@/lib/supabase/server'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userRole = user?.user_metadata?.role || 'Admin'

  return <UsersClient userRole={userRole} />
}

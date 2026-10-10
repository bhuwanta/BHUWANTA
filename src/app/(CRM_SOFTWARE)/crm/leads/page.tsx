import { getLeads } from './actions'
import { getLeadStatuses } from '../modules/actions'
import LeadsClient from './LeadsClient'
import { createClient } from '@/lib/supabase/server'
import { requireAccess } from '@/lib/auth/permissions'

export default async function LeadsPage() {
  await requireAccess('leads')
  const { data: initialLeads, count: totalCount } = await getLeads(1, 50)
  const { data: leadStatuses } = await getLeadStatuses()
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userRole = user?.user_metadata?.role || 'Admin'

  return (
    <div className="w-full">
      <LeadsClient 
        initialLeads={initialLeads} 
        totalCount={totalCount} 
        userRole={userRole} 
        initialStatuses={leadStatuses || []}
      />
    </div>
  )
}

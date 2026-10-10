import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WhatsappDashboardClient from './WhatsappDashboardClient'
import { getWhatsappLeadsWithActivity, getWhatsappAnalytics } from './actions'
import { requireAccess } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function WhatsappDashboardPage() {
  await requireAccess('whatsapp')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/crm/login')
  }

  // Get user role from app_metadata if available, default to Admin
  const userRole = user.app_metadata?.role || 'Admin'

  const { data: initialLeads, count: totalCount } = await getWhatsappLeadsWithActivity(1, 50)
  const analytics = await getWhatsappAnalytics()

  return (
    <WhatsappDashboardClient 
      initialLeads={initialLeads || []} 
      totalCount={totalCount || 0} 
      initialAnalytics={analytics}
      userRole={userRole} 
    />
  )
}

import { createClient } from '@/lib/supabase/server'
import ReportsClient from './ReportsClient'
import { requireAccess } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  await requireAccess('reports')
  const supabase = await createClient()
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching leads for reports:', error)
  }

  return <ReportsClient initialLeads={leads || []} />
}

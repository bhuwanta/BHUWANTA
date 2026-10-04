'use server'

import { createClient } from '@/lib/supabase/server'

export async function getWhatsappLeadsWithActivity(page: number = 1, limit: number = 50) {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  // Fetch leads where source_page contains whatsapp, and join their activities
  const { data, error, count } = await supabase
    .from('leads')
    .select(`
      *,
      lead_activities (*)
    `, { count: 'exact' })
    .ilike('source_page', '%whatsapp%')
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching whatsapp leads:', error)
    return { data: [], count: 0, error: 'Failed to fetch WhatsApp leads' }
  }

  // Ensure activities are ordered by created_at ascending (chronological) for each lead
  const formattedData = data.map((lead: any) => {
    if (lead.lead_activities) {
      lead.lead_activities.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }
    return lead
  })

  return { data: formattedData, count: count || 0, error: null }
}

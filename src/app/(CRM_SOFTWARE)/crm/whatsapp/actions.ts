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

export async function getWhatsappAnalytics() {
  const supabase = await createClient()
  
  // Get all whatsapp leads to compute accurate analytics without pagination limits
  const { data, count } = await supabase
    .from('leads')
    .select(`
      id,
      lead_activities ( activity_type )
    `, { count: 'exact' })
    .ilike('source_page', '%whatsapp%')

  if (!data) return { totalLeads: 0, totalInteractions: 0, totalCallbacks: 0 }

  const totalInteractions = data.reduce((sum, lead) => sum + (lead.lead_activities?.length || 0), 0)
  const totalCallbacks = data.filter(lead => lead.lead_activities?.some((a: any) => a.activity_type === 'Requested Callback')).length

  return { totalLeads: count || 0, totalInteractions, totalCallbacks }
}

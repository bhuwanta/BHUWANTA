'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getLeads(page: number = 1, limit: number = 50) {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching leads:', error)
    return { data: [], count: 0 }
  }

  return { data, count: count || 0 }
}

export async function createLead(formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const message = formData.get('message') as string
  const property_interest = formData.get('property_interest') as string
  const source_page = formData.get('source_page') as string
  const status = formData.get('status') as string
  const location = formData.get('location') as string
  const project = formData.get('project') as string
  const enquiry_type = formData.get('enquiry_type') as string
  const downloaded_item = formData.get('downloaded_item') as string

  if (!name || !email) {
    return { error: 'Name and Email are required' }
  }

  const { data, error } = await supabase
    .from('leads')
    .insert([{
      name,
      email,
      phone: phone || null,
      message: message || '',
      property_interest: property_interest || null,
      source_page: source_page || 'contact',
      status: status || 'new',
      location: location || null,
      project: project || null,
      enquiry_type: enquiry_type || null,
      downloaded_item: downloaded_item || null
    }])
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/crm/leads')
  return { success: true, data }
}

export async function updateLead(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const message = formData.get('message') as string
  const property_interest = formData.get('property_interest') as string
  const source_page = formData.get('source_page') as string
  const status = formData.get('status') as string
  const location = formData.get('location') as string
  const project = formData.get('project') as string
  const enquiry_type = formData.get('enquiry_type') as string
  const downloaded_item = formData.get('downloaded_item') as string

  if (!name || !email) {
    return { error: 'Name and Email are required' }
  }

  const { data, error } = await supabase
    .from('leads')
    .update({
      name,
      email,
      phone: phone || null,
      message: message || '',
      property_interest: property_interest || null,
      source_page: source_page || 'contact',
      status: status || 'new',
      location: location || null,
      project: project || null,
      enquiry_type: enquiry_type || null,
      downloaded_item: downloaded_item || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/crm/leads')
  return { success: true, data }
}

export async function deleteLead(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/crm/leads')
  return { success: true }
}

export async function deleteMultipleLeads(ids: string[]) {
  const supabase = await createClient()

  if (!ids || ids.length === 0) return { success: true }

  const { error } = await supabase
    .from('leads')
    .delete()
    .in('id', ids)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/crm/leads')
  return { success: true }
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/crm/leads')
  return { success: true }
}

export async function getLeadActivities(leadId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching lead activities:', error)
    return { data: [], error: 'Failed to fetch activities' }
  }

  return { data, error: null }
}

// Meta Forms Server Actions
export async function getMetaForms() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('meta_forms')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching meta forms:', error)
    return { data: [], error: error.message }
  }

  return { data, error: null }
}

export async function addMetaForm(form_id: string, name: string = '') {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('meta_forms')
    .insert([{ form_id, name }])
    .select()

  if (error) {
    return { error: error.message }
  }
  return { success: true, data }
}

export async function deleteMetaForm(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('meta_forms')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }
  return { success: true }
}

export async function updateMetaFormName(id: string, name: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('meta_forms')
    .update({ name })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }
  return { success: true }
}

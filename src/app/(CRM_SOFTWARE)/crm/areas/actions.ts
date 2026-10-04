'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAreas() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching areas:', error)
    return []
  }

  return data
}

export async function createArea(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string

  if (!name) {
    return { error: 'Name is required' }
  }

  const { data, error } = await supabase
    .from('areas')
    .insert([{ name }])
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/crm/areas')
  return { success: true, data }
}

export async function updateArea(id: string, formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string

  if (!name) {
    return { error: 'Name is required' }
  }

  const { data, error } = await supabase
    .from('areas')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/crm/areas')
  return { success: true, data }
}

export async function deleteArea(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('areas')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/crm/areas')
  return { success: true }
}

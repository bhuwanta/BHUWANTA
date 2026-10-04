'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { writeClient } from '@/lib/sanity'
import { randomUUID } from 'crypto'

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const location = formData.get('location') as string
  const google_maps_url = formData.get('google_maps_url') as string
  const areaIdsJson = formData.get('areaIds') as string
  
  if (!name) {
    return { error: 'Name is required' }
  }

  // 1. Insert Project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert([{ name, description, location, google_maps_url }])
    .select()
    .single()

  if (projectError) {
    return { error: projectError.message }
  }

  // 2. Insert Area Mappings
  if (areaIdsJson) {
    try {
      const areaIds: string[] = JSON.parse(areaIdsJson)
      if (areaIds.length > 0) {
        const mappings = areaIds.map(areaId => ({
          project_id: project.id,
          area_id: areaId
        }))
        
        const { error: mappingError } = await supabase
          .from('project_areas')
          .insert(mappings)
          
        if (mappingError) {
          console.error("Failed to map areas:", mappingError)
        }
      }
    } catch (e) {
      console.error("Failed to parse areaIds", e)
    }
  }

  // 3. Sync to Sanity
  try {
    const docQuery = `*[_type == "projects"][0]{_id, projectEntries[]{_key, name}}`
    const sanityDoc = await writeClient.fetch(docQuery)
    
    if (sanityDoc?._id) {
      const projectEntries = sanityDoc.projectEntries || []
      const projectEntry = projectEntries.find((p: any) => p.name.trim().toLowerCase() === name.trim().toLowerCase())
      
      if (projectEntry) {
        // Project exists, sync google_maps_url if it was provided
        if (google_maps_url) {
          await writeClient
            .patch(sanityDoc._id)
            .set({ [`projectEntries[_key=="${projectEntry._key}"].googleMapsUrl`]: google_maps_url })
            .commit()
        }
      } else {
        // Project does not exist, create a new entry
        const slugStr = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
        const newEntry = {
          _key: randomUUID(),
          _type: 'object',
          name: name,
          slug: { _type: 'slug', current: slugStr },
          location: location || undefined,
          description: description || undefined,
          googleMapsUrl: google_maps_url || undefined,
        }
        
        await writeClient
          .patch(sanityDoc._id)
          .setIfMissing({ projectEntries: [] })
          .append('projectEntries', [newEntry])
          .commit()
      }
    } else {
      console.error("Sanity 'projects' document not found. Ensure the singleton document exists in Sanity Studio.")
    }
  } catch (e) {
    console.error("Failed to sync project to Sanity", e)
  }

  revalidatePath('/crm/projects')
  return { success: true }
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const location = formData.get('location') as string
  const google_maps_url = formData.get('google_maps_url') as string
  const areaIdsJson = formData.get('areaIds') as string

  if (!name) {
    return { error: 'Name is required' }
  }

  // 1. Update Project
  const { error: projectError } = await supabase
    .from('projects')
    .update({ name, description, location, google_maps_url, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (projectError) {
    return { error: projectError.message }
  }

  // 2. Update Area Mappings
  if (areaIdsJson) {
    try {
      const areaIds: string[] = JSON.parse(areaIdsJson)
      
      // Delete existing mappings
      await supabase
        .from('project_areas')
        .delete()
        .eq('project_id', id)

      // Insert new mappings
      if (areaIds.length > 0) {
        const mappings = areaIds.map(areaId => ({
          project_id: id,
          area_id: areaId
        }))
        
        const { error: mappingError } = await supabase
          .from('project_areas')
          .insert(mappings)
          
        if (mappingError) {
          console.error("Failed to map areas:", mappingError)
        }
      }
    } catch (e) {
      console.error("Failed to parse areaIds", e)
    }
  }

  // 3. Sync to Sanity
  try {
    const docQuery = `*[_type == "projects"][0]{_id, projectEntries[]{_key, name}}`
    const sanityDoc = await writeClient.fetch(docQuery)
    
    if (sanityDoc?._id) {
      const projectEntries = sanityDoc.projectEntries || []
      // Use the updated 'name' to find the project in Sanity
      const projectEntry = projectEntries.find((p: any) => p.name.trim().toLowerCase() === name.trim().toLowerCase())
      
      if (projectEntry) {
        // Project exists, update properties
        await writeClient
          .patch(sanityDoc._id)
          .set({
            [`projectEntries[_key=="${projectEntry._key}"].googleMapsUrl`]: google_maps_url || undefined,
            [`projectEntries[_key=="${projectEntry._key}"].location`]: location || undefined,
            [`projectEntries[_key=="${projectEntry._key}"].description`]: description || undefined,
          })
          .commit()
      } else {
        // Project does not exist, create a new entry
        const slugStr = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
        const newEntry = {
          _key: randomUUID(),
          _type: 'object',
          name: name,
          slug: { _type: 'slug', current: slugStr },
          location: location || undefined,
          description: description || undefined,
          googleMapsUrl: google_maps_url || undefined,
        }
        
        await writeClient
          .patch(sanityDoc._id)
          .setIfMissing({ projectEntries: [] })
          .append('projectEntries', [newEntry])
          .commit()
      }
    } else {
      console.error("Sanity 'projects' document not found. Ensure the singleton document exists in Sanity Studio.")
    }
  } catch (e) {
    console.error("Failed to sync project to Sanity", e)
  }

  revalidatePath('/crm/projects')
  return { success: true }
}

export async function deleteProject(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/crm/projects')
  return { success: true }
}

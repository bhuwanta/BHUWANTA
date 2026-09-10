'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth'
import { isAdminPeer } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/permissions'
import { requirePageModule } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/nav-modules'

/** Areas & Projects is viewable by every non-Customer role (IT through
 * LIA), but only IT/CEO/Governing Council — the same admin-peer set that
 * already manages everything else in this app — can create/edit/delete
 * an Area, Project, or document. The page itself hides that UI for
 * everyone else, but a Server Action is a directly POST-able endpoint
 * regardless of which page rendered the button that calls it, so the
 * real gate has to live here. */
async function requireManagePermission() {
  const caller = await verifyCaller()
  if (!caller || !isAdminPeer(caller.role)) {
    return { success: false as const, error: 'Only IT, CEO, or Governing Council can manage Areas & Projects.' }
  }
  return null
}

export async function createAreaAction(name: string) {
  const denied = await requireManagePermission()
  if (denied) return denied
  try {
    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
      .from('s_areas')
      .insert({ name })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'An area with this name already exists.' }
      }
      throw error
    }
    return { success: true, data, message: 'Area created successfully.' }
  } catch (error: any) {
    console.error('Error creating area:', error)
    return { success: false, error: error.message || 'Failed to create area.' }
  }
}

export async function updateAreaAction(id: string, name: string) {
  const denied = await requireManagePermission()
  if (denied) return denied
  try {
    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin
      .from('s_areas')
      .update({ name })
      .eq('id', id)

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'An area with this name already exists.' }
      }
      throw error
    }
    return { success: true, message: 'Area updated successfully.' }
  } catch (error: any) {
    console.error('Error updating area:', error)
    return { success: false, error: error.message || 'Failed to update area.' }
  }
}

export async function deleteAreaAction(id: string) {
  const denied = await requireManagePermission()
  if (denied) return denied
  try {
    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin
      .from('s_areas')
      .delete()
      .eq('id', id)

    if (error) {
      // s_projects.area_id has no ON DELETE CASCADE (by design — an
      // Area with real Projects under it shouldn't silently vanish).
      if (error.code === '23503') {
        return { success: false, error: 'This area still has Projects assigned to it. Reassign or delete those Projects first.' }
      }
      throw error
    }
    return { success: true, message: 'Area deleted successfully.' }
  } catch (error: any) {
    console.error('Error deleting area:', error)
    return { success: false, error: error.message || 'Failed to delete area.' }
  }
}

export async function getAreasAction() {
  try {
    // Module gate — the page is hidden when this is off, and so
    // is the data behind it.
    const _m = await requirePageModule('areas_projects')
    if (!_m.ok) return { success: false, data: [] as any[], error: _m.error }
    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
      .from('s_areas')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching areas:', error)
    return { success: false, data: [] }
  }
}

/** Directors available to assign to a project — role='director' only. */
export async function getDirectorsListAction() {
  try {
    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
      .from('s_realestate_users')
      .select('id, full_name')
      .eq('role', 'director')
      .eq('is_active', true)
      .order('full_name')

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching directors:', error)
    return { success: false, data: [] }
  }
}

export async function createProjectAction(input: {
  name: string
  areaId: string
  location?: string
  googleMapsUrl?: string
  basePrice?: number
  mrpDefault?: number
  directorIds?: string[]
}) {
  const denied = await requireManagePermission()
  if (denied) return denied
  try {
    if (!input.areaId) {
      return { success: false, error: 'A Project must belong to exactly one Area.' }
    }

    const supabaseAdmin = createServiceClient()

    const { data: project, error: projectError } = await supabaseAdmin
      .from('s_projects')
      .insert({
        name: input.name,
        location: input.location || null,
        google_maps_url: input.googleMapsUrl || null,
        area_id: input.areaId,
        base_price: input.basePrice ?? null,
        mrp_default: input.mrpDefault ?? null,
      })
      .select()
      .single()

    if (projectError) {
      if (projectError.code === '23505') {
        return { success: false, error: 'A project with this name already exists.' }
      }
      throw projectError
    }

    // A new Project auto-assigns to every existing Director by default —
    // symmetric to createExecutiveAction auto-assigning every existing
    // Project to a brand-new Director. Without this, a Project would sit
    // unusable until someone manually ticked every Director in this
    // modal, the same problem the Director-side fix solved. Any
    // explicitly-selected directorIds from the modal are merged in (a
    // no-op today since that would already be every Director, but keeps
    // the manual picker meaningful if that ever changes) and
    // de-duplicated so nobody gets a duplicate-key insert error.
    const { data: allDirectors, error: directorsError } = await supabaseAdmin.from('s_realestate_users').select('id').eq('role', 'director').eq('is_active', true)
    if (directorsError) {
      console.error('Error fetching directors for default Project assignment:', directorsError)
    } else {
      const directorIds = Array.from(new Set([...(allDirectors || []).map((d: { id: string }) => d.id), ...(input.directorIds || [])]))
      if (directorIds.length > 0) {
        const mappings = directorIds.map((directorId) => ({ project_id: project.id, director_id: directorId }))
        const { error: mapError } = await supabaseAdmin.from('s_director_projects').insert(mappings)
        if (mapError) {
          console.error('Error assigning directors:', mapError)
          return { success: false, error: 'Project created, but failed to assign Director(s).' }
        }
      }
    }

    return { success: true, message: 'Project created successfully.' }
  } catch (error: any) {
    console.error('Error creating project:', error)
    return { success: false, error: error.message || 'Failed to create project.' }
  }
}

export async function updateProjectAction(
  projectId: string,
  input: {
    name: string
    areaId: string
    location?: string
    googleMapsUrl?: string
    basePrice?: number
    mrpDefault?: number
    directorIds?: string[]
  }
) {
  const denied = await requireManagePermission()
  if (denied) return denied
  try {
    if (!input.areaId) {
      return { success: false, error: 'A Project must belong to exactly one Area.' }
    }

    const supabaseAdmin = createServiceClient()

    const { error: updateError } = await supabaseAdmin
      .from('s_projects')
      .update({
        name: input.name,
        location: input.location || null,
        google_maps_url: input.googleMapsUrl || null,
        area_id: input.areaId,
        base_price: input.basePrice ?? null,
        mrp_default: input.mrpDefault ?? null,
      })
      .eq('id', projectId)

    if (updateError) throw updateError

    // Replace director assignments wholesale — simpler and safe at this
    // scale than diffing add/remove.
    await supabaseAdmin.from('s_director_projects').delete().eq('project_id', projectId)
    if (input.directorIds && input.directorIds.length > 0) {
      const mappings = input.directorIds.map((directorId) => ({ project_id: projectId, director_id: directorId }))
      const { error: mapError } = await supabaseAdmin.from('s_director_projects').insert(mappings)
      if (mapError) {
        console.error('Error re-assigning directors:', mapError)
        return { success: false, error: 'Project updated, but failed to update Director assignments.' }
      }
    }

    return { success: true, message: 'Project updated successfully.' }
  } catch (error: any) {
    console.error('Error updating project:', error)
    return { success: false, error: error.message || 'Failed to update project.' }
  }
}

/** Replaces a Project's Director assignments only, without touching any
 * of its other fields. updateProjectAction could do this, but it demands
 * the full project payload (name/area/prices), so driving it from a
 * directors-only dialog would mean echoing those values back and risking
 * clobbering an edit someone else made in between. */
export async function setProjectDirectorsAction(projectId: string, directorIds: string[]) {
  const denied = await requireManagePermission()
  if (denied) return denied
  try {
    const supabaseAdmin = createServiceClient()

    const { data: project } = await supabaseAdmin.from('s_projects').select('id, name').eq('id', projectId).maybeSingle()
    if (!project) return { success: false, error: 'Project not found.' }

    // Same wholesale replace as updateProjectAction — simpler and safe
    // at this scale than diffing adds/removes.
    const { error: deleteError } = await supabaseAdmin.from('s_director_projects').delete().eq('project_id', projectId)
    if (deleteError) throw deleteError

    const unique = Array.from(new Set(directorIds))
    if (unique.length > 0) {
      const mappings = unique.map((directorId) => ({ project_id: projectId, director_id: directorId }))
      const { error: insertError } = await supabaseAdmin.from('s_director_projects').insert(mappings)
      if (insertError) throw insertError
    }

    return {
      success: true,
      message: unique.length === 0 ? `${project.name} now has no Directors assigned.` : `${project.name} now has ${unique.length} Director${unique.length === 1 ? '' : 's'} assigned.`,
    }
  } catch (error: any) {
    console.error('Error setting project directors:', error)
    return { success: false, error: error.message || 'Failed to update Directors.' }
  }
}

/** Deletes a Project. `s_director_projects` and `s_project_documents`
 * rows cascade automatically (ON DELETE CASCADE — they're pure
 * associations, safe to drop with the project). `s_new_registrations`
 * deliberately does NOT cascade — a project with real sale history
 * shouldn't be deletable out from under those records, surfaced here as
 * a friendly error rather than a raw FK violation. */
export async function deleteProjectAction(id: string) {
  const denied = await requireManagePermission()
  if (denied) return denied
  try {
    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin
      .from('s_projects')
      .delete()
      .eq('id', id)

    if (error) {
      if (error.code === '23503') {
        return { success: false, error: 'This project has New Registrations recorded against it and cannot be deleted.' }
      }
      throw error
    }
    return { success: true, message: 'Project deleted successfully.' }
  } catch (error: any) {
    console.error('Error deleting project:', error)
    return { success: false, error: error.message || 'Failed to delete project.' }
  }
}

export async function getProjectsAction() {
  try {
    // Module gate — the page is hidden when this is off, and so
    // is the data behind it.
    const _m = await requirePageModule('areas_projects')
    if (!_m.ok) return { success: false, data: [] as any[], error: _m.error }
    const supabaseAdmin = createServiceClient()

    const { data, error } = await supabaseAdmin
      .from('s_projects')
      .select(`
        id,
        name,
        location,
        google_maps_url,
        base_price,
        mrp_default,
        created_at,
        s_areas ( id, name ),
        s_director_projects ( director_id, s_realestate_users ( id, full_name ) )
      `)
      .order('name', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching projects:', error)
    return { success: false, data: [] }
  }
}

// ---- Project documents (brochures/layouts/link documents) ----
// Absorbed from the old Partner "Uploads" page (HIERARCHY.md §7) —
// documents are just another project attribute now, managed here.

export async function getDocumentsAction() {
  try {
    // Module gate — the page is hidden when this is off, and so
    // is the data behind it.
    const _m = await requirePageModule('areas_projects')
    if (!_m.ok) return { success: false, data: [] as any[], error: _m.error }
    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
      .from('s_project_documents')
      .select(`*, s_projects ( id, name )`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error fetching documents:', error)
    return { success: false, data: [] }
  }
}

export async function uploadDocumentAction(formData: FormData) {
  const denied = await requireManagePermission()
  if (denied) return denied
  try {
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string
    const docType = formData.get('documentType') as string

    if (!file || !projectId || !docType) {
      return { success: false, error: 'Missing required fields' }
    }

    const supabaseAdmin = createServiceClient()

    let bucketName = ''
    if (docType === 'brochure') bucketName = 's_brouchers'
    else if (docType === 'layout') bucketName = 's_layouts'
    else if (docType === 'linkdocument') bucketName = 's_linkdocuments'
    else return { success: false, error: 'Invalid document type' }

    const fileExt = file.name.split('.').pop()
    const fileName = `${projectId}-${Date.now()}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage.from(bucketName).upload(fileName, buffer, {
      contentType: file.type,
      upsert: false
    })

    if (uploadError) {
      console.error('Supabase Storage Error:', uploadError)
      return { success: false, error: 'Failed to upload file to storage. Did you create the bucket?' }
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName)
    const fileUrl = publicUrlData.publicUrl

    const { data, error } = await supabaseAdmin
      .from('s_project_documents')
      .insert({
        project_id: projectId,
        document_type: docType,
        file_url: fileUrl,
        file_name: file.name
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Document uploaded successfully.' }
  } catch (error: any) {
    console.error('Error uploading document:', error)
    return { success: false, error: error.message || 'Failed to upload document.' }
  }
}

export async function deleteDocumentAction(id: string, fileUrl: string, docType: string) {
  const denied = await requireManagePermission()
  if (denied) return denied
  try {
    const supabaseAdmin = createServiceClient()

    let bucketName = ''
    if (docType === 'brochure') bucketName = 's_brouchers'
    else if (docType === 'layout') bucketName = 's_layouts'
    else if (docType === 'linkdocument') bucketName = 's_linkdocuments'

    if (bucketName) {
      const fileName = fileUrl.split('/').pop()
      if (fileName) {
        await supabaseAdmin.storage.from(bucketName).remove([fileName])
      }
    }

    const { error } = await supabaseAdmin.from('s_project_documents').delete().eq('id', id)
    if (error) throw error

    return { success: true, message: 'Document deleted successfully.' }
  } catch (error: any) {
    console.error('Error deleting document:', error)
    return { success: false, error: 'Failed to delete document.' }
  }
}

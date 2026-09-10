'use server'

// Small shared helper — project documents (brochure/layout/link) scoped
// to a specific set of project ids. Used by the sales-tier "My
// Projects" page and the Customer Dashboard's "Documents" section; the
// admin-side full CRUD (upload/delete, all projects) lives in
// admin/areas-projects/actions.ts and is not duplicated here.

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { requirePageModule } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/nav-modules'

export async function getDocumentsForProjectsAction(projectIds: string[]) {
  try {
    if (!projectIds || projectIds.length === 0) return { success: true, data: [] as any[] }

    // This had no caller check at all before — it does now, plus the
    // module gate for whichever page the caller is reading from:
    // Customer's Documents page, or the sales tiers' My Projects.
    const caller = await verifyCaller()
    if (!caller) return { success: false, data: [] as any[], error: 'Not authenticated.' }
    const gate = await requirePageModule(caller.role === 'customer' ? 'customer_documents' : 'my_projects')
    if (!gate.ok) return { success: false, data: [] as any[], error: gate.error }

    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
      .from('s_project_documents')
      .select('id, project_id, document_type, file_url, file_name, created_at')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error fetching documents for projects:', error)
    return { success: false, data: [] as any[], error: error.message }
  }
}

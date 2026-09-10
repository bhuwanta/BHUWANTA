'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { findUplineDirectorId } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/org/downline'
import { requirePageModule } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/nav-modules'

/**
 * §5: "A Director's whole downline inherits his Project assignments."
 * Read-only for everyone below Director — resolves the caller's own
 * upline Director (themselves if they already are one), then returns
 * every Project assigned to that Director via S_director_projects. Also
 * used to populate the Project dropdown on the New Registration form —
 * a seller can only submit against a Project their Director is actually
 * assigned to.
 *
 * CEO is the one exception: CEO isn't part of any Director's downline
 * (parent_id is always NULL — admin peers sit above the whole tree, §2),
 * so findUplineDirectorId can never resolve anything for them. Rather
 * than always returning empty (which would make CEO's own New
 * Registration page permanently unusable), CEO gets every Project
 * company-wide — matching how CEO already sees everything company-wide
 * elsewhere (Areas & Projects, Registrations, Payouts), not scoped to
 * one Director's assignments the way every sales-tier role is.
 */
export async function getMyProjectsAction() {
  try {
    // Module gate. This action backs TWO pages — My Projects, and the
    // project dropdown on New Registration — so either module being on
    // is enough. Gating it on my_projects alone would empty the
    // dropdown for a role allowed to sell but not to browse projects.
    const [ownPage, forSelling] = await Promise.all([requirePageModule('my_projects'), requirePageModule('new_registration')])
    if (!ownPage.ok && !forSelling.ok) return { success: false, error: ownPage.error, data: [] }
    const caller = await verifyCaller()
    if (!caller) return { success: false, data: [] as any[], error: 'Not authenticated.' }

    const supabaseAdmin = createServiceClient()

    if (caller.role === 'ceo') {
      const { data, error } = await supabaseAdmin
        .from('s_projects')
        .select('id, name, location, google_maps_url, base_price, mrp_default, s_areas ( id, name )')
      if (error) throw error
      return { success: true, data: data || [] }
    }

    const directorId = await findUplineDirectorId(supabaseAdmin, caller.id, caller.role)
    if (!directorId) return { success: true, data: [] as any[] }

    const { data, error } = await supabaseAdmin
      .from('s_director_projects')
      .select(`
        s_projects (
          id, name, location, google_maps_url, base_price, mrp_default,
          s_areas ( id, name )
        )
      `)
      .eq('director_id', directorId)

    if (error) throw error

    const projects = (data || []).map((row: any) => row.s_projects).filter(Boolean)
    return { success: true, data: projects }
  } catch (error: any) {
    console.error('Error fetching my projects:', error)
    return { success: false, data: [] as any[], error: error.message }
  }
}

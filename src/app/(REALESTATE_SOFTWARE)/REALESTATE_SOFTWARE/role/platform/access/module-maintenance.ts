'use server';

// Data-integrity helper on s_modules, not part of the Modules page.
// modules/commission-rates calls it when a role is deleted so that role
// can't linger in any module's enabled_roles. It lives in platform rather
// than in it/modules so that IT's own folder has zero inbound imports
// from shared modules.

import { createServiceClient } from '@/lib/supabase/server';

/** Strips a role code out of every module's enabled_roles. Call this
 * whenever a role stops existing — a leftover code is a grant pointing
 * at nothing, and if that same code were ever reused for a new role it
 * would silently inherit the old one's access. */
export async function removeRoleFromAllModulesAction(roleCode: string) {
  try {
    const supabaseAdmin = createServiceClient();
    const { data: rows } = await supabaseAdmin.from('s_modules').select('id, enabled_roles');
    const stale = (rows || []).filter((r: any) => ((r.enabled_roles as string[]) || []).includes(roleCode));
    await Promise.all(
      stale.map((r: any) =>
        supabaseAdmin
          .from('s_modules')
          .update({ enabled_roles: ((r.enabled_roles as string[]) || []).filter((c) => c !== roleCode) })
          .eq('id', r.id)
      )
    );
    return { success: true, cleaned: stale.length };
  } catch (error: any) {
    console.error('Error cleaning role from modules:', error);
    return { success: false, cleaned: 0, error: error.message };
  }
}

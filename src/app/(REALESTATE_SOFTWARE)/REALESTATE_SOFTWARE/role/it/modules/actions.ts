'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAdminPeer } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/admin-access';

export async function getModulesAction() {
  try {
    const _gate = await requireAdminPeer();
    if (!_gate.ok) return { success: false, data: [] };
    const supabaseAdmin = createServiceClient();
    const { data, error } = await supabaseAdmin
      .from('s_modules')
      .select('*')
      .order('module_name');

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching modules:', error);
    return { success: false, data: [] };
  }
}

export async function toggleModuleRoleAction(moduleId: string, roles: string[]) {
  try {
    const _gate = await requireAdminPeer();
    if (!_gate.ok) return { success: false, error: _gate.error };
    const supabaseAdmin = createServiceClient();
    const { error } = await supabaseAdmin
      .from('s_modules')
      .update({ enabled_roles: roles })
      .eq('id', moduleId);

    if (error) throw error;

    // Revalidate all three admin shells — any of IT/CEO/GC can toggle this.
    revalidatePath('/REALESTATE_SOFTWARE/role/it/modules');
    revalidatePath('/REALESTATE_SOFTWARE/role/ceo/modules');
    revalidatePath('/REALESTATE_SOFTWARE/role/GoverningCouncil/modules');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating module roles:', error);
    return { success: false, error: error.message };
  }
}

export async function ensurePasswordsModuleExists() {
  try {
    const _gate = await requireAdminPeer();
    if (!_gate.ok) return undefined;
    const supabaseAdmin = createServiceClient();

    const { data: existing } = await supabaseAdmin
      .from('s_modules')
      .select('id')
      .eq('module_key', 'passwords')
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from('s_modules').insert({
        module_key: 'passwords',
        module_name: 'Passwords & Security',
        description: 'Allows selected sales-tier roles to reset their own passwords from their settings page.',
        enabled_roles: []
      });
    }
  } catch (error) {
    console.error('Error ensuring passwords module:', error);
  }
}

export async function ensureHierarchyModuleExists() {
  try {
    const supabaseAdmin = createServiceClient();

    const { data: existing } = await supabaseAdmin
      .from('s_modules')
      .select('id')
      .eq('module_key', 'hierarchy_visualizer')
      .maybeSingle();

    if (!existing) {
      // Opt-in, default off — IT and Operation Manager already see the
      // hierarchy visualizer unconditionally (requireCanViewHierarchy in
      // role/modules/hierarchy/actions.ts), this only extends that
      // same read-only view to whichever sales-tier roles IT chooses.
      await supabaseAdmin.from('s_modules').insert({
        module_key: 'hierarchy_visualizer',
        module_name: 'Visualize Hierarchy',
        description: 'Allows selected sales-tier roles to open the company org-chart / hierarchy visualizer (read-only — no payout figures).',
        enabled_roles: []
      });
    }
  } catch (error) {
    console.error('Error ensuring hierarchy module:', error);
  }
}

export async function ensureBulkPasswordResetModuleExists() {
  try {
    const _gate = await requireAdminPeer();
    if (!_gate.ok) return undefined;
    const supabaseAdmin = createServiceClient();

    const { data: existing } = await supabaseAdmin
      .from('s_modules')
      .select('id')
      .eq('module_key', 'bulk_password_reset')
      .maybeSingle();

    if (!existing) {
      // Opt-in, default off. IT always has this, company-wide,
      // unconditionally — this only extends it to sales-tier roles IT
      // chooses, and even then ONLY over their own downline (their
      // "wing"), enforced server-side (getUsersForBulkPasswordAction /
      // role/it/modules/bulk-password-reset's own route) regardless of
      // what a client ever sends. The bottom-most tier (LIA/LA — no
      // downline) is excluded from the toggle list itself, since there'd
      // be nobody for them to reset.
      await supabaseAdmin.from('s_modules').insert({
        module_key: 'bulk_password_reset',
        module_name: 'Bulk Change Passwords',
        description: 'Allows selected sales-tier roles to reset passwords for their own downline, all at once. IT can always do this company-wide.',
        enabled_roles: []
      });
    }
  } catch (error) {
    console.error('Error ensuring bulk password reset module:', error);
  }
}

export async function ensureUserManagementModuleExists() {
  try {
    const _gate = await requireAdminPeer();
    if (!_gate.ok) return undefined;
    const supabaseAdmin = createServiceClient();

    const { data: existing } = await supabaseAdmin
      .from('s_modules')
      .select('id')
      .eq('module_key', 'user_management')
      .maybeSingle();

    if (!existing) {
      // Default-on for the whole sales chain (HIERARCHY.md §2 — every
      // tier from Director through LIO has downline creation rights;
      // LIA has no downline so the module has no effect for it either
      // way, harmless to include).
      await supabaseAdmin.from('s_modules').insert({
        module_key: 'user_management',
        module_name: 'User Management',
        description: 'Allows selected sales-tier roles to view, create, and manage their downline.',
        enabled_roles: ['director', 'sr_core', 'core', 'gm', 'agm', 'rm', 'lio']
      });
    }
  } catch (error) {
    console.error('Error ensuring user management module:', error);
  }
}

/** Both registration modules seed themselves ENABLED for every current
 * sales tier, unlike the opt-in modules above. New Registration and
 * Registration Status were unconditional for all eight tiers before they
 * became modules, so seeding them empty would have silently taken a core
 * feature away from every sales user the moment this shipped. IT can now
 * switch them off per role deliberately; the default just preserves what
 * was already true. */
async function seedModuleForAllSalesTiers(moduleKey: string, moduleName: string, description: string) {
  try {
    const supabaseAdmin = createServiceClient();

    const { data: existing } = await supabaseAdmin
      .from('s_modules')
      .select('id')
      .eq('module_key', moduleKey)
      .maybeSingle();

    if (existing) return;

    const { data: roleDefs } = await supabaseAdmin.from('s_role_definitions').select('role_code').order('rank', { ascending: true });
    const salesRoleCodes = (roleDefs || []).map((r: any) => r.role_code as string);

    await supabaseAdmin.from('s_modules').insert({
      module_key: moduleKey,
      module_name: moduleName,
      description,
      enabled_roles: salesRoleCodes,
    });
  } catch (error) {
    console.error(`Error ensuring ${moduleKey} module:`, error);
  }
}

export async function ensureNewRegistrationModuleExists() {
  await seedModuleForAllSalesTiers(
    'new_registration',
    'New Registration',
    'Allows selected sales-tier roles to submit a New Registration. Company (CEO) can always submit one, regardless of this setting.'
  );
}

export async function ensureRegistrationStatusModuleExists() {
  await seedModuleForAllSalesTiers(
    'registration_status',
    'Registration Status',
    'Allows selected sales-tier roles to see the Registration Status page for their own downline. IT, Company, Governing Council and Operation Manager always see it company-wide.'
  );
}

export async function ensureWalletModuleExists() {
  const _gate = await requireAdminPeer();
  if (!_gate.ok) return undefined;
  await seedModuleForAllSalesTiers(
    'wallet',
    'My Wallet',
    'Allows selected sales-tier roles to see their own commission payouts. Company and Governing Council always see theirs; IT earns no commission and never has a wallet.'
  );
}

/** Seeds a module already switched on for a fixed set of roles — used by
 * the modules whose audience isn't the sales cascade (Customer's own
 * pages, and Payouts, which only Company/Governing Council can be
 * toggled for). Same reasoning as seedModuleForAllSalesTiers: these
 * pages all worked unconditionally before they became modules, so the
 * seed preserves that and IT switches them off deliberately. */
async function seedModuleForRoles(moduleKey: string, moduleName: string, description: string, roles: string[]) {
  try {
    const supabaseAdmin = createServiceClient();
    const { data: existing } = await supabaseAdmin.from('s_modules').select('id').eq('module_key', moduleKey).maybeSingle();
    if (existing) return;
    await supabaseAdmin.from('s_modules').insert({ module_key: moduleKey, module_name: moduleName, description, enabled_roles: roles });
  } catch (error) {
    console.error(`Error ensuring ${moduleKey} module:`, error);
  }
}

export async function ensurePageModulesExist() {
  await Promise.all([
    seedModuleForAllSalesTiers('dashboard', 'Dashboard', "Allows selected sales-tier roles to see their Dashboard. Customer has no Dashboard, so it isn't listed here."),
    seedModuleForAllSalesTiers('areas_projects', 'Areas & Projects', 'Allows selected sales-tier roles to browse areas and projects.'),
    seedModuleForAllSalesTiers('settings', 'Settings', 'Allows selected sales-tier roles to open their Settings page. Passwords & Security lives inside Settings, so a role must have this before it can have that.'),
    seedModuleForAllSalesTiers('my_projects', 'My Projects', 'Allows selected sales-tier roles to see the projects they are allowed to sell.'),
    seedModuleForRoles('payouts', 'Payouts', 'Allows Company and Governing Council to see the company-wide Payouts page. IT and the Operation Manager always see it.', ['ceo', 'governing_council']),
    seedModuleForRoles('customer_payment', 'Customer — Payment', "Allows customers to see their Payment page.", ['customer']),
    seedModuleForRoles('customer_documents', 'Customer — Documents', 'Allows customers to see their Documents page.', ['customer']),
    seedModuleForRoles('customer_registration_status', 'Customer — Registration Status', 'Allows customers to see the status of their own registrations.', ['customer']),
    seedModuleForRoles('customer_contact', 'Customer — Contact', 'Allows customers to see the Contact page.', ['customer']),
    seedModuleForRoles('customer_settings', 'Customer — Settings', 'Allows customers to open Settings and change their own password. Switching this off leaves them no way to reset it themselves.', ['customer']),
  ]);
}

/** One module's enabled_roles, for a card that gates itself on another
 * module (see ModuleCard's dependsOn). null when the row doesn't exist
 * yet, which callers read as "not configured, nothing locked". */
export async function getModuleEnabledRolesAction(moduleKey: string): Promise<string[] | null> {
  try {
    const _gate = await requireAdminPeer();
    if (!_gate.ok) return null;
    const supabaseAdmin = createServiceClient();
    const { data } = await supabaseAdmin.from('s_modules').select('enabled_roles').eq('module_key', moduleKey).maybeSingle();
    if (!data) return null;
    return (data.enabled_roles as string[]) || [];
  } catch (error) {
    console.error('Error reading module enabled roles:', error);
    return null;
  }
}


'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';

export async function checkPasswordsModuleStatusAction(role: string) {
  try {
    const _caller = await verifyCaller();
    if (!_caller) return { success: false, isEnabled: false };
    const supabaseAdmin = createServiceClient();
    const { data, error } = await supabaseAdmin
      .from('s_modules')
      .select('module_key, enabled_roles')
      .in('module_key', ['passwords', 'settings']);

    if (error) throw error;

    const rowFor = (key: string) => (data || []).find((r: any) => r.module_key === key);
    const listOf = (key: string) => {
      const row = rowFor(key);
      return row && Array.isArray(row.enabled_roles) ? (row.enabled_roles as string[]) : null;
    };

    const passwords = listOf('passwords');
    // The password controls render inside the Settings page, so a role
    // without Settings can't reach them however this flag reads — the
    // dependency is enforced here as well as in the Modules UI so the
    // two can't disagree. A missing settings row means "not configured
    // yet", which doesn't block anything.
    const settings = listOf('settings');
    const settingsAllows = settings === null || settings.includes(role);
    const isEnabled = (passwords ? passwords.includes(role) : false) && settingsAllows;

    return { success: true, isEnabled };
  } catch (error: any) {
    console.error('Error checking module status:', error);
    return { success: false, isEnabled: false };
  }
}

export async function updatePasswordAction(newPassword: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating password:', error);
    return { success: false, error: error.message };
  }
}

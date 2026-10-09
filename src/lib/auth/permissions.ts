import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type AccessLevel = 'none' | 'view' | 'edit'

export async function checkAccess(moduleName: string): Promise<AccessLevel> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }

  // Get user's profile to find their role_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  let roleName = profile?.role
  
  if (!roleName && session.user.user_metadata?.role) {
    roleName = session.user.user_metadata.role
  }

  if (roleName === 'Super Admin') {
    return 'edit' // Super Admin gets full access everywhere
  }
  
  if (!profile) {
    return 'none'
  }
  // 1. Check user-level override
  const { data: userPerm } = await supabase
    .from('user_permissions')
    .select('access_level')
    .eq('user_id', session.user.id)
    .eq('module_name', moduleName)
    .single()

  if (userPerm) {
    return userPerm.access_level as AccessLevel
  }

  // 2. Check role-level permission
  if (profile && profile.role) {
    // First get the role ID for this role name
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('name', profile.role)
      .single()

    if (roleData) {
      const { data: rolePerm } = await supabase
        .from('role_permissions')
        .select('access_level')
        .eq('role_id', roleData.id)
        .eq('module_name', moduleName)
        .single()

      if (rolePerm) {
        return rolePerm.access_level as AccessLevel
      }
    }
  }

  // Default if nothing matches (could be 'none' or 'view' depending on policy)
  // Let's say default is 'none' for strict security
  return 'none'
}

export async function requireAccess(moduleName: string, requiredLevel: 'view' | 'edit' = 'view') {
  const access = await checkAccess(moduleName)
  
  if (access === 'none') {
    redirect('/crm/unauthorized') // or dashboard
  }
  
  if (requiredLevel === 'edit' && access !== 'edit') {
    redirect('/crm/unauthorized')
  }
  
  return access
}

export async function getEffectivePermissions(): Promise<Record<string, AccessLevel>> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const defaultMap: Record<string, AccessLevel> = {}
  
  if (!session) return defaultMap

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  let isSuperAdmin = false
  if (profile) {
    isSuperAdmin = profile.role === 'Super Admin'
  }
  if (!isSuperAdmin && session.user.user_metadata?.role === 'Super Admin') {
    isSuperAdmin = true
  }

  if (!profile && !isSuperAdmin) {
    return defaultMap
  }

  const { data: userPerms } = await supabase
    .from('user_permissions')
    .select('module_name, access_level')
    .eq('user_id', session.user.id)

  let rolePerms: any[] = []
  if (profile && profile.role) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('name', profile.role)
      .single()
      
    if (roleData) {
      const { data } = await supabase
        .from('role_permissions')
        .select('module_name, access_level')
        .eq('role_id', roleData.id)
      rolePerms = data || []
    }
  }

  const allModules = ['dashboard', 'leads', 'users', 'modules', 'whatsapp', 'areas', 'brochures', 'layouts', 'projects', 'reports', 'settings']
  
  allModules.forEach(mod => {
    if (isSuperAdmin) {
      defaultMap[mod] = 'edit'
      return
    }

    const userOverride = userPerms?.find(p => p.module_name === mod)
    if (userOverride) {
      defaultMap[mod] = userOverride.access_level as AccessLevel
      return
    }

    const rolePerm = rolePerms?.find(p => p.module_name === mod)
    if (rolePerm) {
      defaultMap[mod] = rolePerm.access_level as AccessLevel
      return
    }

    defaultMap[mod] = 'none'
  })

  return defaultMap
}

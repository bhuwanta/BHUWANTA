-- 1. Create Role Permissions Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    access_level TEXT NOT NULL CHECK (access_level IN ('none', 'view', 'edit')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, module_name)
);

-- 2. Create User Permissions Table (Overrides)
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    access_level TEXT NOT NULL CHECK (access_level IN ('none', 'view', 'edit')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module_name)
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Super Admin full access, others read-only for enforcement)
CREATE POLICY "Allow read access to everyone" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Allow read access to everyone" ON public.user_permissions FOR SELECT USING (true);
-- (Write operations will be handled securely via our Service Role key in the server actions)

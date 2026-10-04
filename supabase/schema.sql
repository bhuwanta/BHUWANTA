-- ============================================
-- BHUWANTA REAL ESTATE PLATFORM
-- Supabase Database Schema
-- ============================================

-- ===================
-- PROFILES TABLE
-- ===================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'Admin' CHECK (role IN ('Admin', 'Sales Manager', 'Sales Executive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist in case the table was created before we added them
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
CREATE POLICY "Authenticated users can view all profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user signups and insert a profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    'Admin'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================
-- LEADS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  property_interest TEXT,
  source_page TEXT DEFAULT 'contact',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  location TEXT,
  project TEXT,
  enquiry_type TEXT,
  downloaded_item TEXT,
  bot_interactions_count INTEGER DEFAULT 1,
  referred_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert leads" ON leads;
CREATE POLICY "Anyone can insert leads" ON leads FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
CREATE POLICY "Authenticated users can view leads" ON leads FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
CREATE POLICY "Authenticated users can update leads" ON leads FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;
CREATE POLICY "Authenticated users can delete leads" ON leads FOR DELETE USING (auth.role() = 'authenticated');

-- ===================
-- LEAD ACTIVITIES TABLE
-- ===================
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert lead activities" ON lead_activities;
CREATE POLICY "Anyone can insert lead activities" ON lead_activities FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can view lead activities" ON lead_activities;
CREATE POLICY "Authenticated users can view lead activities" ON lead_activities FOR SELECT USING (auth.role() = 'authenticated');

-- ===================
-- AREAS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial areas
INSERT INTO areas (name) VALUES 
  ('Warangal Highway'),
  ('Mumbai Highway'),
  ('Shabad'),
  ('Sharkarpally Highway'),
  ('Bangalore Highway')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage areas" ON areas;
CREATE POLICY "Authenticated users manage areas" ON areas FOR ALL USING (auth.role() = 'authenticated');

-- ===================
-- PROJECTS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  google_maps_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage projects" ON projects;
CREATE POLICY "Authenticated users manage projects" ON projects FOR ALL USING (auth.role() = 'authenticated');

-- ===================
-- PROJECT_AREAS JUNCTION TABLE
-- ===================
CREATE TABLE IF NOT EXISTS project_areas (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, area_id)
);

ALTER TABLE project_areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage project_areas" ON project_areas;
CREATE POLICY "Authenticated users manage project_areas" ON project_areas FOR ALL USING (auth.role() = 'authenticated');

-- ===================
-- SEED INITIAL PROJECTS
-- ===================
DO $$
DECLARE
  warangal_id UUID;
  mumbai_id UUID;
  shabad_id UUID;
  proj_id UUID;
BEGIN
  -- Get area IDs
  SELECT id INTO warangal_id FROM areas WHERE name = 'Warangal Highway' LIMIT 1;
  SELECT id INTO mumbai_id FROM areas WHERE name = 'Mumbai Highway' LIMIT 1;
  SELECT id INTO shabad_id FROM areas WHERE name = 'Shabad' LIMIT 1;

  IF warangal_id IS NOT NULL THEN
    INSERT INTO projects (name, location, google_maps_url) 
    VALUES (
      'S.V.KANAKA MAPLE HOMES', 
      'Yadigiri Gutta Temple near Mallapur village', 
      'https://www.google.com/maps/place/SV+Kanaka+Maple+Homes/@17.625177,78.903841,17z/data=!3m1!4b1!4m6!3m5!1s0x3bcb6500350f921f:0xd384f5ea7e43f6e5!8m2!3d17.625177!4d78.903841!16s%2Fg%2F11w7cbb_1n!18m1!1e1?entry=tts&g_ep=EgoyMDI2MDYxMC4wIPu8ASoASAFQAw%3D%3D&skid=88c698fa-c07b-46cd-9ade-bd66a921d633'
    ) RETURNING id INTO proj_id;
    INSERT INTO project_areas (project_id, area_id) VALUES (proj_id, warangal_id) ON CONFLICT DO NOTHING;
  END IF;

  IF mumbai_id IS NOT NULL THEN
    INSERT INTO projects (name, location, google_maps_url) 
    VALUES (
      'TJR TownShip', 
      'SANGAREDDY JUNCTION', 
      'https://www.google.com/maps/place/17%C2%B035''11.5%22N+78%C2%B005''19.1%22E/@17.586525,78.088632,17z/data=!3m1!4b1!4m4!3m3!8m2!3d17.586525!4d78.088632!18m1!1e1?entry=tts&g_ep=EgoyMDI2MDYxMC4wIPu8ASoASAFQAw%3D%3D&skid=facd03b3-0945-4a86-a9a4-e45285103328'
    ) RETURNING id INTO proj_id;
    INSERT INTO project_areas (project_id, area_id) VALUES (proj_id, mumbai_id) ON CONFLICT DO NOTHING;
    
    INSERT INTO projects (name, location, google_maps_url) 
    VALUES (
      'VAIBHAV COUNTY', 
      'SADASHIVPET', 
      'https://maps.app.goo.gl/JNEip4dr8Kpza1tP9'
    ) RETURNING id INTO proj_id;
    INSERT INTO project_areas (project_id, area_id) VALUES (proj_id, mumbai_id) ON CONFLICT DO NOTHING;
  END IF;

  IF shabad_id IS NOT NULL THEN
    INSERT INTO projects (name, location, google_maps_url) 
    VALUES (
      'VIAN VALLY', 
      'SHABADH', 
      'https://www.google.com/maps/place/Shabad,+Telangana+509217/@17.1617666,78.1333539,15z/data=!3m1!4b1!4m6!3m5!1s0x3bcbc51af8bfa167:0x1b157767f422e78!8m2!3d17.1611023!4d78.1331926!16s%2Fm%2F02r3_dg!18m1!1e1?entry=tts&g_ep=EgoyMDI2MDYxMC4wIPu8ASoASAFQAw%3D%3D&skid=415a74f7-8835-433a-8b23-234121efe814'
    ) RETURNING id INTO proj_id;
    INSERT INTO project_areas (project_id, area_id) VALUES (proj_id, shabad_id) ON CONFLICT DO NOTHING;
  END IF;
END $$;

CREATE POLICY "Public can view media files" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete media" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.role() = 'authenticated');

-- ===================
-- SUBSCRIBERS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert subscribers" ON subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users manage subscribers" ON subscribers FOR ALL USING (auth.role() = 'authenticated');

-- ===================
-- META FORMS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS meta_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meta_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage meta_forms" ON meta_forms FOR ALL USING (auth.role() = 'authenticated');

-- Add provider_id to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS provider_id TEXT UNIQUE;

-- Add referred_by to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- ============================================================
-- CRM & WEBSITE MODULES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_key TEXT UNIQUE NOT NULL,
  module_name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE crm_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view crm_modules" ON crm_modules FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage crm_modules" ON crm_modules FOR ALL USING (auth.role() = 'authenticated');

-- Seed Website Downloads & Forms OTP Verification module
INSERT INTO crm_modules (module_key, module_name, description, enabled)
VALUES (
  'website_downloads_otp',
  'Website Downloads & Form OTP Verification',
  'Requires OTP phone verification on public brochure downloads and lead contact forms.',
  true
)
ON CONFLICT (module_key) DO NOTHING;

-- Create dynamic roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the initial roles
INSERT INTO roles (name) VALUES 
  ('Admin'), 
  ('Super Admin'), 
  ('Telecaller')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS for roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view and manage roles
CREATE POLICY "Authenticated users can manage roles" 
ON roles FOR ALL 
USING (auth.role() = 'authenticated');

-- Add module permissions JSONB column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS accessible_modules JSONB DEFAULT '["dashboard"]'::jsonb;

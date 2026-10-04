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

-- ============================================================
-- CRM & WEBSITE MODULES TABLE
-- Dedicated to Public Website & CRM Feature Toggles
-- Decoupled from Real Estate Software (s_modules)
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

-- Enable Row Level Security
ALTER TABLE crm_modules ENABLE ROW LEVEL SECURITY;

-- Allow public read access so public site forms and APIs can verify toggle states
CREATE POLICY "Public can view crm_modules" 
  ON crm_modules 
  FOR SELECT 
  USING (true);

-- Allow authenticated CRM users full access to manage modules
CREATE POLICY "Authenticated users can manage crm_modules" 
  ON crm_modules 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Seed Website Downloads & Forms OTP Verification module
INSERT INTO crm_modules (module_key, module_name, description, enabled)
VALUES (
  'website_downloads_otp',
  'Website Downloads & Form OTP Verification',
  'Requires OTP phone verification on public brochure downloads and lead contact forms.',
  true
)
ON CONFLICT (module_key) DO UPDATE 
SET module_name = EXCLUDED.module_name,
    description = EXCLUDED.description;

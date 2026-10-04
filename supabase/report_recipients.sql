-- ============================================================
-- REPORT RECIPIENTS TABLE
-- Manages the list of emails that receive the automated PDF/Excel CRM reports
-- ============================================================

CREATE TABLE IF NOT EXISTS report_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE report_recipients ENABLE ROW LEVEL SECURITY;

-- Allow authenticated CRM users full access to manage report recipients
CREATE POLICY "Authenticated users can manage report_recipients" 
  ON report_recipients 
  FOR ALL 
  USING (auth.role() = 'authenticated');

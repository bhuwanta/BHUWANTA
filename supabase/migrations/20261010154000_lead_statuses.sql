-- ============================================================
-- LEAD STATUSES TABLE & CONFIGURATION
-- ============================================================

-- 1. Drop the hardcoded check constraint on leads table so custom statuses can be saved
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- 2. Create lead_statuses table
CREATE TABLE IF NOT EXISTS lead_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT UNIQUE NOT NULL,
  color_bg TEXT NOT NULL DEFAULT 'bg-blue-50',
  color_text TEXT NOT NULL DEFAULT 'text-blue-700',
  color_border TEXT DEFAULT 'border-blue-200',
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE lead_statuses ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "Public can view lead_statuses" ON lead_statuses;
CREATE POLICY "Public can view lead_statuses"
  ON lead_statuses
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage lead_statuses" ON lead_statuses;
CREATE POLICY "Authenticated users can manage lead_statuses"
  ON lead_statuses
  FOR ALL
  USING (auth.role() = 'authenticated');

-- 5. Seed Default Statuses
INSERT INTO lead_statuses (name, key, color_bg, color_text, color_border, description, sort_order, is_system, is_default)
VALUES
  ('New', 'new', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'Newly captured inquiry awaiting outreach', 10, true, true),
  ('Contacted', 'contacted', 'bg-blue-50', 'text-blue-700', 'border-blue-200', 'Outreach initiated via call or message', 20, false, false),
  ('Uncontacted', 'uncontacted', 'bg-orange-50', 'text-orange-700', 'border-orange-200', 'Call unanswered or unreachable', 30, false, false),
  ('Qualified', 'qualified', 'bg-purple-50', 'text-purple-700', 'border-purple-200', 'Buyer requirements and budget verified', 40, false, false),
  ('Site Visit Scheduled', 'site_visit_scheduled', 'bg-indigo-50', 'text-indigo-700', 'border-indigo-200', 'On-site property tour booked', 50, false, false),
  ('Site Visit Done', 'site_visit_done', 'bg-cyan-50', 'text-cyan-700', 'border-cyan-200', 'Prospective buyer completed site tour', 60, false, false),
  ('Negotiation', 'negotiation', 'bg-amber-50', 'text-amber-700', 'border-amber-200', 'Pricing, payment plan, or unit discussions', 70, false, false),
  ('Booked', 'booked', 'bg-teal-50', 'text-teal-700', 'border-teal-200', 'Unit booked with advance payment', 80, false, false),
  ('Rejected', 'rejected', 'bg-red-50', 'text-red-700', 'border-red-200', 'Lead invalid, uninterested, or out of budget', 90, false, false),
  ('Closed', 'closed', 'bg-slate-100', 'text-slate-700', 'border-slate-200', 'Deal finalized and registered', 100, false, false)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  color_bg = EXCLUDED.color_bg,
  color_text = EXCLUDED.color_text,
  color_border = EXCLUDED.color_border,
  sort_order = EXCLUDED.sort_order;

-- 6. Add report_times column to recipients tables if not already present
ALTER TABLE report_recipients ADD COLUMN IF NOT EXISTS report_times TEXT[] DEFAULT ARRAY['10:00', '13:00', '17:00', '20:00'];
ALTER TABLE whatsapp_report_recipients ADD COLUMN IF NOT EXISTS report_times TEXT[] DEFAULT ARRAY['10:00', '13:00', '17:00', '20:00'];

-- 7. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';

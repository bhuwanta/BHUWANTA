CREATE TABLE IF NOT EXISTS system_alert_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  instant_alerts BOOLEAN DEFAULT true,
  daily_digest BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_alert_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read system alert recipients" 
ON system_alert_recipients FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert system alert recipients" 
ON system_alert_recipients FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update system alert recipients" 
ON system_alert_recipients FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to delete system alert recipients" 
ON system_alert_recipients FOR DELETE 
TO authenticated 
USING (true);

-- Seed initial master admin alert email if empty
INSERT INTO system_alert_recipients (email, name, instant_alerts, daily_digest)
VALUES ('bhuwanta9@gmail.com', 'Master Admin', true, true)
ON CONFLICT (email) DO NOTHING;


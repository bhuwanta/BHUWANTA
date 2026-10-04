CREATE TABLE whatsapp_report_recipients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_report_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read whatsapp recipients" 
ON whatsapp_report_recipients FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert whatsapp recipients" 
ON whatsapp_report_recipients FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete whatsapp recipients" 
ON whatsapp_report_recipients FOR DELETE
TO authenticated 
USING (true);

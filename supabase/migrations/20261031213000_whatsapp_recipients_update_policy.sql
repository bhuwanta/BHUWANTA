-- Ensure UPDATE policy exists on whatsapp_report_recipients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'whatsapp_report_recipients' 
    AND policyname = 'Allow authenticated users to update whatsapp recipients'
  ) THEN
    CREATE POLICY "Allow authenticated users to update whatsapp recipients" 
    ON whatsapp_report_recipients FOR UPDATE 
    TO authenticated 
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Update default for report_times to match active WhatsApp report slots
ALTER TABLE whatsapp_report_recipients 
ALTER COLUMN report_times SET DEFAULT ARRAY['6', '9', '12', '15', '18', '21'];

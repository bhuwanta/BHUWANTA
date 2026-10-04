import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://byroxiesodeyxxsalgsf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5cm94aWVzb2RleXh4c2FsZ3NmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY4NzgyNCwiZXhwIjoyMDkyMjYzODI0fQ.BFt5XfcYqNAM90tf5K8IVCyMzw9ALqxoAepBYsTyOVY'
);

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error('Please provide an email as argument');
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: 'http://localhost:3000/crm/update-password'
    }
  });

  if (error) {
    console.error('Error generating link:', error);
  } else {
    console.log('\n✅ Link generated successfully (Bypassing Email Rate Limits)!');
    console.log('\nCLICK THIS LINK TO TEST THE FLOW:');
    console.log('------------------------------------------------------');
    console.log(data.properties.action_link);
    console.log('------------------------------------------------------\n');
  }
}

run();

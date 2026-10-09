import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('Fetching roles...')
  const { data: roles } = await supabase.from('roles').select('id, name')
  console.log('Roles:', roles)

  const roleMap = {}
  roles.forEach(r => roleMap[r.name] = r.id)

  console.log('Fetching profiles...')
  const { data: profiles } = await supabase.from('profiles').select('id, role')
  console.log(`Found ${profiles.length} profiles`)

  for (const p of profiles) {
    if (p.role && roleMap[p.role]) {
      const { error } = await supabase.from('profiles').update({ role_id: roleMap[p.role] }).eq('id', p.id)
      if (error) {
        console.error(`Error updating profile ${p.id}:`, error)
      } else {
        console.log(`Updated profile ${p.id} with role_id for ${p.role}`)
      }
    }
  }
  
  console.log('Done migrating profiles.')
}

run()

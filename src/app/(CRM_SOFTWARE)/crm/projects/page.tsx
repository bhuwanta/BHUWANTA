import { createClient } from '@/lib/supabase/server'
import ProjectsClient from './ProjectsClient'
import { client } from '@/lib/sanity'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = await createClient()
  
  const { data: areas } = await supabase
    .from('areas')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch projects and their mapped areas using the junction table
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      project_areas(
        area:areas(*)
      )
    `)
    .order('created_at', { ascending: false })

  // Fetch Sanity projects to sync googleMapsUrl
  const sanityData = await client.fetch(`*[_type == "projects"][0]{ projectEntries[]{ name, googleMapsUrl } }`)
  
  if (projects && sanityData?.projectEntries) {
    projects.forEach(p => {
      const sp = sanityData.projectEntries.find((s: any) => s.name.trim().toLowerCase() === p.name.trim().toLowerCase())
      if (sp && sp.googleMapsUrl) {
        p.google_maps_url = sp.googleMapsUrl
      }
    })
  }

  return <ProjectsClient projects={projects || []} areas={areas || []} />
}

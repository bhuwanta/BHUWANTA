import { getAreas } from './actions'
import AreasClient from './AreasClient'
import { requireAccess } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function AreasPage() {
  const accessLevel = await requireAccess('areas')
  const initialAreas = await getAreas()

  return (
    <AreasClient initialAreas={initialAreas} canEdit={accessLevel === 'edit'} />
  )
}

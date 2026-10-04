import { getAreas } from './actions'
import AreasClient from './AreasClient'

export const dynamic = 'force-dynamic'

export default async function AreasPage() {
  const initialAreas = await getAreas()

  return (
    <AreasClient initialAreas={initialAreas} />
  )
}

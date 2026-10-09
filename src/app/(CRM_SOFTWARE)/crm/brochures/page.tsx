import { requireAccess } from '@/lib/auth/permissions'
import BrochuresClient from './BrochuresClient'

export const dynamic = 'force-dynamic'

export default async function BrochuresPage() {
  const accessLevel = await requireAccess('brochures')
  return <BrochuresClient canEdit={accessLevel === 'edit'} />
}

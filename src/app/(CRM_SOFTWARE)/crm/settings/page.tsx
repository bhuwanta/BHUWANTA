import { requireAccess } from '@/lib/auth/permissions'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  await requireAccess('settings')
  return <SettingsClient />
}

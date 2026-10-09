import ModulesClient from './ModulesClient'
import { getOtpDownloadEnabled } from '@/lib/otp-config'
import { requireAccess } from '@/lib/auth/permissions'
import { getReportRecipients, getWaRecipients } from './actions'
import { getRoles, listAdminUsers } from '../users/actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Modules & Feature Controls | Bhuwanta CRM',
  description: 'Manage website modules and OTP verification settings',
}

export default async function ModulesPage() {
  await requireAccess('modules')
  const initialOtpEnabled = await getOtpDownloadEnabled()
  const { data: initialRecipients } = await getReportRecipients()
  const { data: initialWaRecipients } = await getWaRecipients()
  const roles = await getRoles()
  const users = await listAdminUsers()

  return (
    <ModulesClient 
      initialOtpEnabled={initialOtpEnabled} 
      initialRecipients={initialRecipients || []} 
      initialWaRecipients={initialWaRecipients || []}
      roles={roles.data || []}
      users={users.users || []}
    />
  )
}

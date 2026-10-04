import ModulesClient from './ModulesClient'
import { getOtpDownloadEnabled } from '@/lib/otp-config'
import { getReportRecipients, getWaRecipients } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Modules & Feature Controls | Bhuwanta CRM',
  description: 'Manage website modules and OTP verification settings',
}

export default async function ModulesPage() {
  const initialOtpEnabled = await getOtpDownloadEnabled()
  const { data: initialRecipients } = await getReportRecipients()
  const { data: initialWaRecipients } = await getWaRecipients()

  return (
    <ModulesClient 
      initialOtpEnabled={initialOtpEnabled} 
      initialRecipients={initialRecipients || []} 
      initialWaRecipients={initialWaRecipients || []}
    />
  )
}

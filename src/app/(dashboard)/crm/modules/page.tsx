import ModulesClient from './ModulesClient'
import { getOtpDownloadEnabled } from '@/lib/otp-config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Modules & Feature Controls | Bhuwanta CRM',
  description: 'Manage website modules and OTP verification settings',
}

export default async function ModulesPage() {
  const initialOtpEnabled = await getOtpDownloadEnabled()

  return <ModulesClient initialOtpEnabled={initialOtpEnabled} />
}

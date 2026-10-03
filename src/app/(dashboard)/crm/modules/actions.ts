'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOtpDownloadEnabled, setOtpDownloadEnabled } from '@/lib/otp-config'

export interface OtpModuleResponse {
  success: boolean
  downloadOtpEnabled: boolean
  error?: string
}

/**
 * Server action to get current status of the OTP module
 */
export async function getOtpModuleStatus(): Promise<OtpModuleResponse> {
  try {
    const enabled = await getOtpDownloadEnabled()
    return {
      success: true,
      downloadOtpEnabled: enabled,
    }
  } catch (error) {
    console.error('Error fetching OTP module status:', error)
    return {
      success: false,
      downloadOtpEnabled: true,
      error: 'Failed to retrieve OTP status',
    }
  }
}

/**
 * Server action to toggle OTP verification for downloads
 */
export async function toggleOtpModuleStatus(enabled: boolean): Promise<OtpModuleResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userEmail = user?.email || user?.user_metadata?.full_name || 'CRM Admin'

    const updatedValue = await setOtpDownloadEnabled(enabled, userEmail)

    // Revalidate affected routes
    revalidatePath('/crm/modules')
    revalidatePath('/api/otp-config')

    return {
      success: true,
      downloadOtpEnabled: updatedValue,
    }
  } catch (error) {
    console.error('Error updating OTP module status:', error)
    return {
      success: false,
      downloadOtpEnabled: !enabled,
      error: 'Failed to update OTP configuration',
    }
  }
}

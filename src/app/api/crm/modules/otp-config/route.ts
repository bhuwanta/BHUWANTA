import { NextRequest, NextResponse } from 'next/server'
import { getOtpDownloadEnabled, setOtpDownloadEnabled } from '@/lib/otp-config'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const downloadOtpEnabled = await getOtpDownloadEnabled()
    return NextResponse.json({ downloadOtpEnabled })
  } catch (error) {
    console.error('Error in GET /api/crm/modules/otp-config:', error)
    return NextResponse.json({ downloadOtpEnabled: true }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    if (typeof body?.downloadOtpEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid payload: downloadOtpEnabled boolean required' },
        { status: 400 }
      )
    }

    const updated = await setOtpDownloadEnabled(
      body.downloadOtpEnabled,
      user.email || 'CRM Admin'
    )

    return NextResponse.json({
      success: true,
      downloadOtpEnabled: updated,
    })
  } catch (error) {
    console.error('Error in POST /api/crm/modules/otp-config:', error)
    return NextResponse.json(
      { error: 'Failed to update OTP configuration' },
      { status: 500 }
    )
  }
}

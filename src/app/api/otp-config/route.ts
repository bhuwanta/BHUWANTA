import { NextResponse } from 'next/server'
import { getOtpDownloadEnabled } from '@/lib/otp-config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const downloadOtpEnabled = await getOtpDownloadEnabled()
    return NextResponse.json(
      { downloadOtpEnabled },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Failed to get OTP config:', error)
    return NextResponse.json({ downloadOtpEnabled: true }, { status: 200 })
  }
}

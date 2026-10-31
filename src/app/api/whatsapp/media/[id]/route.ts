import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: mediaId } = await context.params
    if (!mediaId || !/^\d{5,35}$/.test(mediaId)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 })
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'WhatsApp integration not configured' }, { status: 503 })
    }

    // Step 1: Retrieve temporary media download URL from Meta Graph API
    const metaRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!metaRes.ok) {
      const errText = await metaRes.text()
      console.error('Failed to get WhatsApp media URL from Meta:', metaRes.status, errText)
      return NextResponse.json({ error: 'Failed to locate media from WhatsApp' }, { status: metaRes.status })
    }

    const metaData = await metaRes.json()
    if (!metaData?.url) {
      return NextResponse.json({ error: 'Media URL not provided by WhatsApp' }, { status: 404 })
    }

    // Step 2: Fetch binary media content from Meta CDN
    const mediaRes = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!mediaRes.ok) {
      return NextResponse.json({ error: 'Failed to download media content' }, { status: mediaRes.status })
    }

    const mimeType = metaData.mime_type || mediaRes.headers.get('content-type') || 'application/octet-stream'

    return new NextResponse(mediaRes.body, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=86400, stale-while-revalidate=3600',
      }
    })
  } catch (error: any) {
    console.error('Error streaming WhatsApp media:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

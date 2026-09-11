import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { getSiteUrl } from '@/lib/site-url'

// Ensure RESEND_API_KEY is available in the environment
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Sanity webhook payload should be configured to send:
    // { "title": "...", "slug": "...", "excerpt": "...", "imageUrl": "..." }
    // PROJECTION in Sanity Webhook:
    // { "title": title, "slug": slug.current, "excerpt": excerpt, "imageUrl": ogImage.asset->url }
    const { title, slug, excerpt, imageUrl } = body

    if (!title || !slug) {
      return NextResponse.json({ error: 'Missing title or slug in payload' }, { status: 400 })
    }

    // Initialize Supabase Service Client (bypasses RLS)
    const supabase = createServiceClient()

    // Fetch active subscribers
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('email')
      .eq('status', 'active')

    if (error) {
      console.error('Failed to fetch subscribers:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ message: 'No active subscribers to notify' })
    }

    const bccEmails = subscribers.map((sub: any) => sub.email)
    const blogUrl = `${getSiteUrl()}/blog/${slug}`

    // Industry Standard Email Template Design
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #0f1d33;">
        <div style="text-align: center; padding: 20px;">
          <h1 style="color: #c4a55a; margin: 0;">BHUWANTA</h1>
          <p style="color: #5a6a82; font-size: 14px; margin-top: 5px;">Premium Real Estate Solutions</p>
        </div>
        ${imageUrl ? `<img src="${imageUrl}" alt="${title}" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;" />` : ''}
        <h2 style="color: #0f1d33; font-size: 24px; margin-bottom: 10px;">${title}</h2>
        <p style="color: #5a6a82; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
          ${excerpt || 'Read our latest insights and updates.'}
        </p>
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${blogUrl}" style="background-color: #c4a55a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
            Read Full Article
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e8ecf2; margin: 30px 0;" />
        <div style="text-align: center; font-size: 12px; color: #5a6a82;">
          <p>You received this email because you subscribed to Bhuwanta newsletters.</p>
        </div>
      </div>
    `

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Bhuwanta Updates <info@bhuwanta.com>',
      to: ['info@bhuwanta.com'], // Primary recipient
      bcc: bccEmails,            // Send to all subscribers via BCC
      subject: `New Post: ${title}`,
      html: emailHtml,
    })

    if (emailError) {
      console.error('Failed to send emails via Resend:', emailError)
      return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Successfully notified subscribers!', emailData })
  } catch (error: unknown) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

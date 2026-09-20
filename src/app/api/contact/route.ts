import { cleanAttribution, campaignSource } from '@/lib/lead-attribution'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { contactRateLimiter } from '@/lib/redis'
import { sendContactNotification, resend } from '@/lib/resend'
import { client, autoresponderQuery, writeClient } from '@/lib/sanity'

async function sendDynamicAutoresponder(toName: string, toEmail: string) {
  if (!resend) return

  try {
    // Fetch settings from Sanity
    const settings = await client.fetch(autoresponderQuery)
    if (!settings) return

    const { fromName, fromEmail, subjectLine, messageBody, logoUrl, attachmentUrl, attachmentFilename } = settings

    // Construct highly professional HTML
    const html = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <img src="${logoUrl || 'https://bhuwanta.com/logo.png'}" alt="${fromName}" style="max-height: 50px; margin-bottom: 24px;" />
        <h2 style="color: #002935; font-size: 20px; font-weight: 600; margin-bottom: 16px;">Hello ${toName},</h2>
        <div style="color: #5a6a82; line-height: 1.6; font-size: 15px; white-space: pre-wrap;">${messageBody}</div>
        <br/>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8ecf2;">
          <p style="color: #002935; font-size: 14px; margin: 0;">Best regards,</p>
          <p style="color: #B69A4E; font-weight: 600; font-size: 14px; margin: 4px 0 0 0;">${fromName || 'Bhuwanta Team'}</p>
        </div>
      </div>
    `

    // Process optional PDF attachment directly from Sanity CDN
    const attachments = []
    if (attachmentUrl) {
      try {
        const pdfRes = await fetch(attachmentUrl)
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())
        attachments.push({
          filename: attachmentFilename || 'Bhuwanta_Brochure.pdf',
          content: pdfBuffer,
        })
      } catch (e) {
        console.error('Failed to attach PDF buffer:', e)
      }
    }

    // Send the email
    const { error } = await resend.emails.send({
      from: `${fromName || 'Bhuwanta'} <${fromEmail || 'info@bhuwanta.com'}>`,
      to: toEmail,
      subject: subjectLine || 'Thank you for contacting us',
      html,
      attachments: attachments.length > 0 ? attachments : undefined
    })

    if (error) {
      console.error('Resend Autoresponder Error:', error)
    }
  } catch (err) {
    console.error('Failed to send dynamic autoresponder:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    if (contactRateLimiter) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      const { success, remaining } = await contactRateLimiter.limit(ip)
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
        )
      }
    }

    const body = await request.json()
    const { name, email, phone, location, project, enquiryType, message, sourcePage, referredBy } = body

    const attribution = cleanAttribution(body.attribution)
    const campaign = campaignSource(attribution)
    const attributedSource = `${campaign ? campaign + ' | ' : ''}${sourcePage || 'Website'}`
    const attributionNote = Object.keys(attribution).length ? `\nCampaign metadata (browser supplied): ${JSON.stringify(attribution)}` : ''
    let leadId: string

    // Create a summarized budget string for CRM (Sanity/Supabase) backwards compatibility
    const locationStr = location && location !== 'Not Sure' ? `Location: ${location} | ` : ''
    const budget = `${locationStr}Project: ${project} | Type: ${enquiryType} | Message: ${message}`

    // Validation — email is optional (short-form lead capture only asks name + phone)
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required.' },
        { status: 400 }
      )
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      )
    }

    // Insert into Sanity (Primary CRM)
    try {
      const savedLead = await writeClient.create({
        _type: 'lead',
        name,
        email: email || '',
        phone: phone || '',
        budget: budget || '',
        sourcePage: attributedSource,
        attribution,
        referredBy: referredBy || '',
        status: 'new',
      })
      leadId = savedLead._id
    } catch (dbError) {
      console.error('Sanity insert error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save your message. Please try again.' },
        { status: 500 }
      )
    }

    // Backup into Supabase (Safety net — non-blocking)
    try {
      const supabase = createServiceClient()
      
      // Extract download item if it's a download
      const isDownload = enquiryType?.includes('Document Download')
      const downloadedItem = isDownload ? enquiryType.replace('Document Download: ', '') : null

      const { error: backupError } = await supabase.from('leads').insert({
        name,
        email: email || '',
        phone: phone || null,
        message: `${message || ''}${attributionNote}`,
        location: location && location !== 'All' ? location : null,
        project: project && project !== 'Not Sure' ? project : null,
        enquiry_type: enquiryType || 'Website Inquiry',
        downloaded_item: downloadedItem,
        source_page: attributedSource,
        referred_by: referredBy || null,
        status: 'new',
      })
      if (backupError) throw backupError
    } catch (backupErr) {
      console.error('Supabase backup insert failed (non-critical):', backupErr)
    }

    // Send emails (non-blocking, don't fail the request) — the autoresponder and
    // reply-to both need a real email, which short-form (name + phone only) leads
    // won't have, so skip the lead-facing emails and just notify the team.
    try {
      await Promise.all([
        sendContactNotification({ name, email, phone, location, project, enquiryType, message, sourcePage, referredBy }),
        ...(email ? [sendDynamicAutoresponder(name, email)] : []),
      ])
    } catch (emailError) {
      console.error('Email send error:', emailError)
      // Don't fail the request, lead is saved
    }

    return NextResponse.json({ success: true, leadId, message: 'Message sent successfully!' })
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

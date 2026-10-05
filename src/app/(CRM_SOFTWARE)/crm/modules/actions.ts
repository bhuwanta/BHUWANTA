'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOtpDownloadEnabled, setOtpDownloadEnabled } from '@/lib/otp-config'
import { redis } from '@/lib/redis'
import { Resend } from 'resend'

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

// ----------------------------------------------------------------------
// REPORT RECIPIENTS ACTIONS
// ----------------------------------------------------------------------

export interface ReportRecipient {
  id: string
  email: string
  created_at: string
}

export async function getReportRecipients(): Promise<{ data: ReportRecipient[], error: string | null }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('report_recipients')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      // If table doesn't exist yet or any other error occurs, return empty array gracefully to prevent page crashes
      console.warn('report_recipients table might not exist yet:', error)
      return { data: [], error: null }
    }

    return { data: data || [], error: null }
  } catch (err: any) {
    console.error('Error fetching report recipients:', err)
    return { data: [], error: null } // return gracefully instead of crashing
  }
}

export async function addReportRecipient(email: string): Promise<{ success: boolean, error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('report_recipients')
      .insert([{ email }])

    if (error) throw error
    revalidatePath('/crm/modules')
    return { success: true }
  } catch (err: any) {
    console.error('Error adding report recipient:', err)
    return { success: false, error: err.message || 'Failed to add recipient' }
  }
}

export async function removeReportRecipient(id: string): Promise<{ success: boolean, error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('report_recipients')
      .delete()
      .eq('id', id)

    if (error) throw error
    revalidatePath('/crm/modules')
    return { success: true }
  } catch (err: any) {
    console.error('Error removing report recipient:', err)
    return { success: false, error: err.message || 'Failed to remove recipient' }
  }
}

export async function testReportEmail(email: string, testHour?: number): Promise<{ success: boolean, error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const cronSecret = process.env.CRON_SECRET || ''
    
    let url = `${baseUrl}/api/cron/leads-report?testEmail=${encodeURIComponent(email)}`
    if (typeof testHour === 'number') {
      url += `&testHour=${testHour}`
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      }
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Failed to send report: ${errText}`)
    }

    return { success: true }
  } catch (err: any) {
    console.error('Error testing report email:', err)
    return { success: false, error: err.message || 'Failed to send test email' }
  }
}

export async function sendEmailOtp(email: string): Promise<{ success: boolean, error?: string }> {
  try {
    if (!redis) throw new Error('Redis is not configured for OTP services.')
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store in redis with 10 mins expiry
    const key = `email-otp:${email}`
    await redis.set(key, otp, { ex: 600 })
    
    // Send email
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'info@bhuwanta.com'
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bhuwanta.com'
    const logoUrl = `${siteUrl}/logo.png`

    const { error } = await resend.emails.send({
      from: `Bhuwanta Security <${fromEmail}>`,
      to: email,
      subject: 'Verify your email for Bhuwanta CRM Reports (Valid for 10 minutes)',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e8ecf2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #0f1d33; padding: 24px; text-align: center;">
            <img src="${logoUrl}" alt="Bhuwanta" style="height: 48px; width: auto; margin-bottom: 16px;" onerror="this.style.display='none'" />
            <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Email Verification</h2>
          </div>
          
          <div style="padding: 32px 24px;">
            <p style="color: #5a6a82; font-size: 16px; line-height: 1.5; margin-top: 0;">
              You recently requested to add this email address to the <strong>Bhuwanta CRM</strong> automated report recipients list.
            </p>
            
            <div style="background-color: #f3f5f8; padding: 24px; text-align: center; border-radius: 8px; margin: 32px 0; border: 1px dashed #c4a55a;">
              <p style="margin: 0; color: #5a6a82; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-bottom: 12px;">Your Verification Code</p>
              <strong style="font-size: 42px; letter-spacing: 8px; color: #0f1d33; display: block;">${otp}</strong>
            </div>
            
            <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 12px 16px; margin-bottom: 24px;">
              <p style="margin: 0; color: #e65100; font-size: 14px; font-weight: 500;">
                <strong>Time Sensitive:</strong> For security reasons, this code is only valid for exactly <strong>10 minutes</strong>.
              </p>
            </div>

            <p style="color: #8c9bad; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
              If you did not make this request, someone may have mistyped their email address. You can safely delete and ignore this message.
            </p>
          </div>
          
          <div style="background-color: #f8fafc; border-top: 1px solid #e8ecf2; padding: 16px 24px; text-align: center;">
            <p style="color: #8c9bad; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Bhuwanta. All rights reserved.
            </p>
          </div>
        </div>
      `
    })

    if (error) throw error
    
    return { success: true }
  } catch (err: any) {
    console.error('Error sending email OTP:', err)
    return { success: false, error: err.message || 'Failed to send OTP email' }
  }
}

export async function verifyAndAddEmail(email: string, otp: string): Promise<{ success: boolean, error?: string }> {
  try {
    if (!redis) throw new Error('Redis is not configured for OTP services.')
    
    const key = `email-otp:${email}`
    const storedOtp = await redis.get(key)
    
    if (!storedOtp || String(storedOtp) !== String(otp)) {
      return { success: false, error: 'Invalid or expired OTP code' }
    }
    
    // Add to DB
    const res = await addReportRecipient(email)
    if (!res.success) throw new Error(res.error)
    
    // Cleanup OTP
    await redis.del(key)
    
    return { success: true }
  } catch (err: any) {
    console.error('Error verifying email OTP:', err)
    return { success: false, error: err.message || 'Verification failed' }
  }
}

// ----------------------------------------------------------------------
// WHATSAPP RECIPIENTS ACTIONS
// ----------------------------------------------------------------------

export interface WaRecipient {
  id: string
  phone_number: string
  name: string | null
  created_at: string
}

export async function getWaRecipients(): Promise<{ data: WaRecipient[], error: string | null }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('whatsapp_report_recipients')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('whatsapp_report_recipients table might not exist yet:', error)
      return { data: [], error: null }
    }

    return { data: data || [], error: null }
  } catch (err: any) {
    console.error('Error fetching WA recipients:', err)
    return { data: [], error: null }
  }
}

export async function addWaRecipient(phone_number: string, name?: string | null): Promise<{ success: boolean, error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('whatsapp_report_recipients')
      .insert([{ 
        phone_number,
        name: name && name.trim() ? name.trim() : null
      }])

    if (error) throw error
    revalidatePath('/crm/modules')
    return { success: true }
  } catch (err: any) {
    console.error('Error adding WA recipient:', err)
    return { success: false, error: err.message || 'Failed to add WhatsApp number' }
  }
}

export async function updateWaRecipient(
  id: string, 
  updates: { name?: string | null; phone_number?: string }
): Promise<{ success: boolean, error?: string }> {
  try {
    const supabase = await createClient()
    const payload: { name?: string | null; phone_number?: string } = {}

    if (updates.name !== undefined) {
      payload.name = updates.name && updates.name.trim() ? updates.name.trim() : null
    }

    if (updates.phone_number !== undefined) {
      let cleanPhone = updates.phone_number.replace(/\D/g, '')
      if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`
      }
      if (!/^\d{10,15}$/.test(cleanPhone)) {
        return { success: false, error: 'Invalid phone number format' }
      }
      payload.phone_number = cleanPhone
    }

    const { error } = await supabase
      .from('whatsapp_report_recipients')
      .update(payload)
      .eq('id', id)

    if (error) throw error
    revalidatePath('/crm/modules')
    return { success: true }
  } catch (err: any) {
    console.error('Error updating WA recipient:', err)
    return { success: false, error: err.message || 'Failed to update recipient' }
  }
}

export async function updateWaRecipientName(id: string, name: string): Promise<{ success: boolean, error?: string }> {
  return updateWaRecipient(id, { name })
}

export async function removeWaRecipient(id: string): Promise<{ success: boolean, error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('whatsapp_report_recipients')
      .delete()
      .eq('id', id)

    if (error) throw error
    revalidatePath('/crm/modules')
    return { success: true }
  } catch (err: any) {
    console.error('Error removing WA recipient:', err)
    return { success: false, error: err.message || 'Failed to remove WhatsApp number' }
  }
}

export async function sendWaOtp(phone: string): Promise<{ success: boolean, error?: string }> {
  try {
    if (!redis) throw new Error('Redis is not configured for OTP services.')
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store in redis with 10 mins expiry
    const key = `wa-otp:${phone}`
    await redis.set(key, otp, { ex: 600 })
    
    // Check if Meta API keys exist
    const token = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    
    if (!token || !phoneId) {
      // In development, log the OTP so we can test without real API keys
      console.log(`[DEV MODE] WhatsApp OTP for ${phone}: ${otp}`);
      return { success: true, error: 'Meta API Keys missing. Check console for DEV OTP.' }
    }
    
    // Send via Meta API (Free-form text message within 24h window)
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: {
          preview_url: false,
          body: `*Bhuwanta CRM*\n\nYour WhatsApp verification code is: *${otp}*\n\nThis code will expire in 10 minutes.`
        }
      })
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Meta API Error:', data)
      throw new Error(data.error?.message || 'Failed to send WhatsApp message')
    }
    
    return { success: true }
  } catch (err: any) {
    console.error('Error sending WA OTP:', err)
    return { success: false, error: err.message || 'Failed to send WhatsApp OTP' }
  }
}

export async function verifyAndAddWa(phone: string, otp: string): Promise<{ success: boolean, error?: string }> {
  try {
    if (!redis) throw new Error('Redis is not configured for OTP services.')
    
    const key = `wa-otp:${phone}`
    const storedOtp = await redis.get(key)
    
    if (!storedOtp || String(storedOtp) !== String(otp)) {
      return { success: false, error: 'Invalid or expired OTP code' }
    }
    
    // Add to DB
    const res = await addWaRecipient(phone)
    if (!res.success) throw new Error(res.error)
    
    // Cleanup OTP
    await redis.del(key)
    
    return { success: true }
  } catch (err: any) {
    console.error('Error verifying WA OTP:', err)
    return { success: false, error: err.message || 'Verification failed' }
  }
}

export async function testReportWa(phone: string, testHour?: number): Promise<{ success: boolean, error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const cronSecret = process.env.CRON_SECRET || ''
    
    let url = `${baseUrl}/api/cron/leads-report?testWaPhone=${encodeURIComponent(phone)}`
    if (typeof testHour === 'number') {
      url += `&testHour=${testHour}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      }
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Failed to send report: ${errText}`)
    }

    return { success: true }
  } catch (err: any) {
    console.error('Error testing report WA:', err)
    return { success: false, error: err.message || 'Failed to send test WhatsApp message' }
  }
}



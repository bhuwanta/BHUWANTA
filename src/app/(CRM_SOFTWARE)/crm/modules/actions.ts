'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
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
  name: string | null
  created_at: string
  report_times?: string[] | null
}

export async function getReportRecipients(): Promise<{ data: ReportRecipient[], error: string | null }> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('report_recipients')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      // If table doesn't exist yet or any other error occurs, return empty array gracefully to prevent page crashes
      console.warn('report_recipients table might not exist yet:', error)
      return { data: [], error: null }
    }

    let recipientsList: ReportRecipient[] = (data || []) as ReportRecipient[]
    const hasMaster = recipientsList.some((r: ReportRecipient) => r.email?.toLowerCase() === 'bhuwanta9@gmail.com')
    if (!hasMaster) {
      const { data: insertedMaster } = await supabase
        .from('report_recipients')
        .insert([{ email: 'bhuwanta9@gmail.com', name: 'Master Admin' }])
        .select()
      if (insertedMaster && insertedMaster.length > 0) {
        recipientsList = [insertedMaster[0] as ReportRecipient, ...recipientsList]
      }
    }

    return { data: recipientsList, error: null }
  } catch (err: any) {
    console.error('Error fetching report recipients:', err)
    return { data: [], error: null } // return gracefully instead of crashing
  }
}

export async function addReportRecipient(email: string, name?: string | null): Promise<{ success: boolean, error?: string }> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('report_recipients')
      .insert([{ 
        email,
        name: name && name.trim() ? name.trim() : null
      }])

    if (error) throw error
    revalidatePath('/crm/modules')
    return { success: true }
  } catch (err: any) {
    console.error('Error adding report recipient:', err)
    return { success: false, error: err.message || 'Failed to add recipient' }
  }
}

export async function updateReportRecipient(
  id: string,
  updates: { name?: string | null; email?: string; report_times?: string[] | null }
): Promise<{ success: boolean, error?: string }> {
  try {
    const supabase = createServiceClient()
    const payload: Record<string, any> = {}

    if (updates.name !== undefined) {
      payload.name = updates.name && updates.name.trim() ? updates.name.trim() : null
    }

    if (updates.email !== undefined) {
      payload.email = updates.email.trim().toLowerCase()
    }

    if (updates.report_times !== undefined) {
      payload.report_times = updates.report_times
    }

    // Helper: attempt an upsert/update, and if it fails because
    // report_times column doesn't exist yet, retry without it.
    const stripTimingsAndRetry = (err: any, payloadObj: Record<string, any>): Record<string, any> | null => {
      const msg = String(err?.message || err?.code || '')
      if (msg.includes('report_times') && 'report_times' in payloadObj) {
        const { report_times: _dropped, ...rest } = payloadObj
        return rest
      }
      return null
    }

    // Check if ID is a valid UUID format
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const isMasterAdmin = id === 'master-admin-default' || updates.email?.toLowerCase() === 'bhuwanta9@gmail.com'

    if (isMasterAdmin) {
      const masterUpdate: Record<string, any> = { 
        email: 'bhuwanta9@gmail.com', 
        name: payload.name !== undefined ? payload.name : 'Master Admin' 
      }
      if (payload.report_times !== undefined) {
        masterUpdate.report_times = payload.report_times
      }

      const { error: upsertError } = await supabase
        .from('report_recipients')
        .upsert([masterUpdate], { onConflict: 'email' })

      if (upsertError) {
        const fallback = stripTimingsAndRetry(upsertError, masterUpdate)
        if (fallback && Object.keys(fallback).length > 0) {
          const { error: retryErr } = await supabase
            .from('report_recipients')
            .upsert([fallback], { onConflict: 'email' })
          if (retryErr) throw retryErr
        } else {
          throw upsertError
        }
      }
      revalidatePath('/crm/modules')
      return { success: true }
    }

    if (!isUuid) {
      throw new Error(`Invalid recipient ID format: ${id}`)
    }

    const { data, error } = await supabase
      .from('report_recipients')
      .update(payload)
      .eq('id', id)
      .select()

    if (error) {
      const fallback = stripTimingsAndRetry(error, payload)
      if (fallback && Object.keys(fallback).length > 0) {
        const { data: d2, error: e2 } = await supabase
          .from('report_recipients')
          .update(fallback)
          .eq('id', id)
          .select()
        if (e2) throw e2
        if (!d2 || d2.length === 0) throw new Error('Recipient not found in database')
      } else {
        throw error
      }
    } else if (!data || data.length === 0) {
      throw new Error('Recipient not found in database')
    }

    revalidatePath('/crm/modules')
    return { success: true }
  } catch (err: any) {
    console.error('Error updating report recipient:', err)
    return { success: false, error: err.message || 'Failed to update recipient' }
  }
}

export async function removeReportRecipient(id: string): Promise<{ success: boolean, error?: string }> {
  try {
    const supabase = createServiceClient()

    // Protect Master Admin from deletion
    const { data: target } = await supabase
      .from('report_recipients')
      .select('email')
      .eq('id', id)
      .maybeSingle()

    if (target?.email?.toLowerCase() === 'bhuwanta9@gmail.com') {
      return { success: false, error: 'Master Admin cannot be removed.' }
    }

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

export async function verifyAndAddEmail(email: string, otp: string, name?: string | null): Promise<{ success: boolean, error?: string }> {
  try {
    if (!redis) throw new Error('Redis is not configured for OTP services.')
    
    const key = `email-otp:${email}`
    const storedOtp = await redis.get(key)
    
    if (!storedOtp || String(storedOtp) !== String(otp)) {
      return { success: false, error: 'Invalid or expired OTP code' }
    }
    
    // Add to DB
    const res = await addReportRecipient(email, name)
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
  report_times?: string[] | null
}

export async function getWaRecipients(): Promise<{ data: WaRecipient[], error: string | null }> {
  try {
    const supabase = createServiceClient()
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
    const supabase = createServiceClient()
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
  updates: { name?: string | null; phone_number?: string; report_times?: string[] | null }
): Promise<{ success: boolean, error?: string }> {
  try {
    const supabase = createServiceClient()
    const payload: Record<string, any> = {}

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
    if (updates.report_times !== undefined) {
      payload.report_times = updates.report_times
    }

    const { data, error } = await supabase
      .from('whatsapp_report_recipients')
      .update(payload)
      .eq('id', id)
      .select()

    if (error) {
      // If the error is because report_times column doesn't exist, retry without it
      const msg = String(error?.message || '')
      if (msg.includes('report_times') && 'report_times' in payload) {
        const { report_times: _dropped, ...fallback } = payload
        if (Object.keys(fallback).length > 0) {
          const { data: d2, error: e2 } = await supabase
            .from('whatsapp_report_recipients')
            .update(fallback)
            .eq('id', id)
            .select()
          if (e2) throw e2
          if (!d2 || d2.length === 0) throw new Error('Recipient not found in database')
        } else {
          // Only report_times was being updated and column doesn't exist
          console.warn('report_times column does not exist yet in whatsapp_report_recipients. Skipping.')
          revalidatePath('/crm/modules')
          return { success: true }
        }
      } else {
        throw error
      }
    } else if (!data || data.length === 0) {
      throw new Error('Recipient not found in database')
    }

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
    const supabase = createServiceClient()
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

// ----------------------------------------------------------------------
// ACCESS CONTROL ACTIONS
// ----------------------------------------------------------------------

import { getEffectivePermissions as getEffectivePerms } from '@/lib/auth/permissions'

export type AccessLevel = 'none' | 'view' | 'edit'

export interface RolePermission {
  id?: string
  role_id: string
  module_name: string
  access_level: AccessLevel
}

export interface UserPermission {
  id?: string
  user_id: string
  module_name: string
  access_level: AccessLevel
}

export async function getRolePermissions(roleId: string): Promise<{ data: RolePermission[], error: string | null }> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', roleId)

    if (error) return { data: [], error: error.message }
    return { data: data as RolePermission[], error: null }
  } catch (err: any) {
    return { data: [], error: err.message }
  }
}

export async function updateRolePermissions(roleId: string, permissions: { module_name: string, access_level: AccessLevel }[]): Promise<{ success: boolean, error?: string }> {
  try {
    const supabase = createServiceClient()
    // Upsert permissions
    if (permissions.length === 0) {
      // If none, maybe they cleared all? Let's delete all.
      await supabase.from('role_permissions').delete().eq('role_id', roleId)
    } else {
      const payload = permissions.map(p => ({
        role_id: roleId,
        module_name: p.module_name,
        access_level: p.access_level
      }))
      
      const { error } = await supabase
        .from('role_permissions')
        .upsert(payload, { onConflict: 'role_id,module_name' })

      if (error) throw error
      
      // Also delete any removed permissions
      const keptModules = permissions.map(p => p.module_name)
      await supabase.from('role_permissions').delete().eq('role_id', roleId).not('module_name', 'in', `(${keptModules.map(m => `"${m}"`).join(',')})`)
    }

    revalidatePath('/crm/modules')
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { success: false, error: err.message }
  }
}

export async function getUserPermissions(userId: string): Promise<{ data: UserPermission[], error: string | null }> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)

    if (error) return { data: [], error: error.message }
    return { data: data as UserPermission[], error: null }
  } catch (err: any) {
    return { data: [], error: err.message }
  }
}

export async function updateUserPermissions(userId: string, permissions: { module_name: string, access_level: AccessLevel }[]): Promise<{ success: boolean, error?: string }> {
  try {
    const supabase = createServiceClient()
    
    // Clear all existing overrides first
    const { error: deleteError } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)
      
    if (deleteError) throw deleteError

    // Insert new ones if any
    if (permissions.length > 0) {
      const payload = permissions.map(p => ({
        user_id: userId,
        module_name: p.module_name,
        access_level: p.access_level
      }))
      const { error } = await supabase.from('user_permissions').insert(payload)
      if (error) throw error
    }

    revalidatePath('/crm/modules')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getEffectivePermissionsClient(): Promise<Record<string, AccessLevel>> {
  return await getEffectivePerms()
}

// ============================================================
// LEAD STATUSES MODULE
// ============================================================

export interface LeadStatus {
  id: string
  name: string
  key: string
  color_bg: string
  color_text: string
  color_border?: string
  description?: string | null
  sort_order: number
  is_system: boolean
  is_default: boolean
  leads_count?: number
  created_at?: string
  updated_at?: string
}

export async function getLeadStatuses(): Promise<{ success: boolean; data: LeadStatus[]; error?: string }> {
  try {
    const supabase = createServiceClient()
    
    // Fetch all statuses
    const { data: statuses, error } = await supabase
      .from('lead_statuses')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    // Fetch counts from leads table
    const { data: leadRows, error: leadsError } = await supabase
      .from('leads')
      .select('status')

    const countMap: Record<string, number> = {}
    if (!leadsError && leadRows) {
      for (const row of leadRows) {
        const sKey = (row.status || 'new').toLowerCase().trim()
        countMap[sKey] = (countMap[sKey] || 0) + 1
      }
    }

    const enrichedStatuses = (statuses || []).map((s: any) => ({
      ...s,
      leads_count: countMap[s.key.toLowerCase()] || 0
    }))

    return { success: true, data: enrichedStatuses }
  } catch (err: any) {
    console.error('Error fetching lead statuses:', err)
    return { success: false, data: [], error: err.message || 'Failed to fetch lead statuses' }
  }
}

export async function createLeadStatus(payload: {
  name: string
  key?: string
  color_bg?: string
  color_text?: string
  color_border?: string
  description?: string
  sort_order?: number
}): Promise<{ success: boolean; data?: LeadStatus; error?: string }> {
  try {
    const supabase = createServiceClient()
    const trimmedName = (payload.name || '').trim()
    if (!trimmedName) {
      return { success: false, error: 'Status name is required.' }
    }

    // Auto-generate key from name if not provided
    const key = (payload.key || trimmedName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')

    if (!key) {
      return { success: false, error: 'Invalid status identifier slug.' }
    }

    // Check duplicate key or name
    const { data: existing } = await supabase
      .from('lead_statuses')
      .select('id, name, key')
      .or(`key.eq.${key},name.ilike.${trimmedName}`)
      .maybeSingle()

    if (existing) {
      return { success: false, error: `A status with name "${trimmedName}" or key "${key}" already exists.` }
    }

    const { data, error } = await supabase
      .from('lead_statuses')
      .insert({
        name: trimmedName,
        key,
        color_bg: payload.color_bg || 'bg-blue-50',
        color_text: payload.color_text || 'text-blue-700',
        color_border: payload.color_border || 'border-blue-200',
        description: payload.description || null,
        sort_order: typeof payload.sort_order === 'number' ? payload.sort_order : 50,
        is_system: false,
        is_default: false
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/crm/modules')
    revalidatePath('/crm/leads')
    return { success: true, data }
  } catch (err: any) {
    console.error('Error creating lead status:', err)
    return { success: false, error: err.message || 'Failed to create lead status.' }
  }
}

export async function updateLeadStatus(
  id: string,
  updates: {
    name?: string
    color_bg?: string
    color_text?: string
    color_border?: string
    description?: string
    sort_order?: number
  }
): Promise<{ success: boolean; data?: LeadStatus; error?: string }> {
  try {
    const supabase = createServiceClient()

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (updates.name !== undefined) {
      const trimmed = updates.name.trim()
      if (!trimmed) return { success: false, error: 'Status name cannot be empty.' }
      updatePayload.name = trimmed
    }
    if (updates.color_bg !== undefined) updatePayload.color_bg = updates.color_bg
    if (updates.color_text !== undefined) updatePayload.color_text = updates.color_text
    if (updates.color_border !== undefined) updatePayload.color_border = updates.color_border
    if (updates.description !== undefined) updatePayload.description = updates.description
    if (updates.sort_order !== undefined) updatePayload.sort_order = updates.sort_order

    const { data, error } = await supabase
      .from('lead_statuses')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/crm/modules')
    revalidatePath('/crm/leads')
    return { success: true, data }
  } catch (err: any) {
    console.error('Error updating lead status:', err)
    return { success: false, error: err.message || 'Failed to update lead status.' }
  }
}

export async function getLeadStatusUsage(statusKey: string): Promise<{ count: number }> {
  try {
    const supabase = createServiceClient()
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', statusKey)

    if (error) throw error
    return { count: count || 0 }
  } catch (err) {
    console.error('Error checking status usage:', err)
    return { count: 0 }
  }
}

export async function deleteLeadStatus(
  id: string,
  reassignToKey?: string
): Promise<{ success: boolean; remappedCount?: number; error?: string }> {
  try {
    const supabase = createServiceClient()

    // 1. Fetch the target status to verify protection and get key
    const { data: targetStatus, error: fetchErr } = await supabase
      .from('lead_statuses')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !targetStatus) {
      return { success: false, error: 'Status not found.' }
    }

    // 2. Safeguard: Prevent deleting protected system statuses (e.g., 'new')
    if (targetStatus.is_system) {
      return {
        success: false,
        error: `"${targetStatus.name}" is a protected system default status and cannot be deleted.`
      }
    }

    // 3. Check if any leads currently use this status
    const { count: leadsUsingStatus } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', targetStatus.key)

    const usageCount = leadsUsingStatus || 0

    // 4. If leads are currently assigned and NO reassign target is provided, block with instruction
    if (usageCount > 0 && !reassignToKey) {
      return {
        success: false,
        remappedCount: usageCount,
        error: `IN_USE: This status is currently assigned to ${usageCount} active lead(s). Please choose a fallback status to reassign them.`
      }
    }

    // 5. Reassign existing leads if reassignToKey is provided
    if (usageCount > 0 && reassignToKey) {
      if (reassignToKey === targetStatus.key) {
        return { success: false, error: 'Cannot reassign leads to the status being deleted.' }
      }

      const { error: reassignErr } = await supabase
        .from('leads')
        .update({ status: reassignToKey, updated_at: new Date().toISOString() })
        .eq('status', targetStatus.key)

      if (reassignErr) throw reassignErr
    }

    // 6. Delete the status row
    const { error: deleteErr } = await supabase
      .from('lead_statuses')
      .delete()
      .eq('id', id)

    if (deleteErr) throw deleteErr

    revalidatePath('/crm/modules')
    revalidatePath('/crm/leads')
    return { success: true, remappedCount: usageCount }
  } catch (err: any) {
    console.error('Error deleting lead status:', err)
    return { success: false, error: err.message || 'Failed to delete lead status.' }
  }
}

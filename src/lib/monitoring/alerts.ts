import { createClient } from '@supabase/supabase-js'
import { resend } from '@/lib/resend'
import { redis } from '@/lib/redis'

export type AlertSeverity = 'HEALTHY' | 'WARNING' | 'CRITICAL'

export interface SystemAlertItem {
  service: string // e.g., 'Meta WhatsApp Cloud API', 'Supabase Database', 'Resend Mailer', 'Meta Ads Lead Sync'
  status: AlertSeverity
  message: string
  details?: string
  actionRequired?: string
  timestamp?: string
}

export interface SystemMonitoringPayload {
  title: string
  environment?: string
  host?: string
  items: SystemAlertItem[]
  triggeredBy?: string
  cooldownKey?: string // Redis key to throttle repeated alert emails (e.g. 'wa-auth-401')
  cooldownSeconds?: number // Cooldown duration in seconds (default: 3600 = 1 hr)
  forceSend?: boolean // Set true to bypass throttle cooldown (e.g., manual test button)
  targetEmails?: string[] // Optional direct override of recipients
}

export interface AlertRecipient {
  id: string
  name: string
  email: string
  instant_alerts: boolean
  daily_digest: boolean
  created_at?: string
  updated_at?: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getServiceSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey)
}

function escapeHtml(unsafe: string = ''): string {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Fetch alert recipients from Supabase with Redis and env fallbacks.
 */
export async function getAlertRecipientsList(onlyInstant: boolean = true): Promise<string[]> {
  const fallbackEmail = process.env.ADMIN_ALERT_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'bhuwanta9@gmail.com'
  const supabase = getServiceSupabase()

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('system_alert_recipients')
        .select('email, instant_alerts, daily_digest')

      if (!error && data && data.length > 0) {
        const filtered = data
          .filter(r => (onlyInstant ? r.instant_alerts !== false : true))
          .map(r => r.email.trim().toLowerCase())
          .filter(e => e.includes('@'))

        if (filtered.length > 0) {
          return Array.from(new Set(filtered))
        }
      }
    } catch {
      // Fall through to Redis fallback
    }
  }

  // Redis fallback if DB table not yet migrated
  if (redis) {
    try {
      const cached = await redis.get<string[]>('crm:system_alert_emails')
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return Array.from(new Set(cached))
      }
    } catch {
      // Ignore Redis error
    }
  }

  return [fallbackEmail]
}

/**
 * Build a structured, high-legibility HTML monitoring table for emails.
 */
export function renderMonitoringTableHtml(payload: SystemMonitoringPayload): string {
  const nowIst = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(new Date())

  const hasCritical = payload.items.some(i => i.status === 'CRITICAL')
  const hasWarning = payload.items.some(i => i.status === 'WARNING')

  const bannerColor = hasCritical ? '#EF4444' : hasWarning ? '#F59E0B' : '#10B981'
  const bannerText = hasCritical 
    ? 'CRITICAL ALERT — Subsystem Degradation Requires Action' 
    : hasWarning 
    ? 'WARNING — Subsystem Operating with Notices' 
    : 'SYSTEM HEALTH — All Subsystems Operating Normally'

  const rows = payload.items.map((item, index) => {
    const rowBg = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
    
    let badgeBg = '#DCFCE7'
    let badgeText = '#166534'
    let badgeBorder = '#BBF7D0'
    let statusLabel = '✅ HEALTHY'

    if (item.status === 'CRITICAL') {
      badgeBg = '#FEE2E2'
      badgeText = '#991B1B'
      badgeBorder = '#FECACA'
      statusLabel = '🚨 CRITICAL'
    } else if (item.status === 'WARNING') {
      badgeBg = '#FEF3C7'
      badgeText = '#92400E'
      badgeBorder = '#FDE68A'
      statusLabel = '⚠️ WARNING'
    }

    const timeStr = item.timestamp || nowIst

    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 12px 14px; font-size: 13px; color: #475569; white-space: nowrap; vertical-align: top;">
          ${escapeHtml(timeStr)}
        </td>
        <td style="padding: 12px 14px; font-size: 14px; font-weight: 600; color: #0F172A; vertical-align: top;">
          ${escapeHtml(item.service)}
        </td>
        <td style="padding: 12px 14px; vertical-align: top;">
          <span style="display: inline-block; padding: 4px 8px; font-size: 11px; font-weight: 700; border-radius: 4px; background-color: ${badgeBg}; color: ${badgeText}; border: 1px solid ${badgeBorder}; text-transform: uppercase;">
            ${statusLabel}
          </span>
        </td>
        <td style="padding: 12px 14px; font-size: 13px; color: #1E293B; vertical-align: top;">
          <div style="font-weight: 600; margin-bottom: 4px;">${escapeHtml(item.message)}</div>
          ${item.details ? `<div style="font-family: monospace; font-size: 12px; color: #64748B; background: #F1F5F9; padding: 6px 8px; border-radius: 4px; word-break: break-all; margin-top: 4px;">${escapeHtml(item.details)}</div>` : ''}
        </td>
        <td style="padding: 12px 14px; font-size: 13px; color: ${item.actionRequired ? '#B91C1C' : '#64748B'}; font-weight: ${item.actionRequired ? '600' : 'normal'}; vertical-align: top;">
          ${item.actionRequired ? escapeHtml(item.actionRequired) : '—'}
        </td>
      </tr>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background-color: #F1F5F9; color: #0F172A;">
        <div style="max-width: 820px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <div style="background-color: #002935; padding: 20px 24px; border-bottom: 3px solid #C4A55A;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h1 style="color: #FFFFFF; font-size: 20px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">
                Bhuwanta CRM <span style="color: #C4A55A; font-weight: 400;">| System Monitoring</span>
              </h1>
            </div>
            <p style="color: #94A3B8; font-size: 13px; margin: 6px 0 0 0;">
              Report: <strong>${escapeHtml(payload.title)}</strong> • Generated: ${escapeHtml(nowIst)} (IST)
            </p>
          </div>

          <!-- Alert Severity Status Bar -->
          <div style="background-color: ${bannerColor}; color: #FFFFFF; padding: 10px 24px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">
            ${bannerText}
          </div>

          <!-- Content Body -->
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.5; color: #334155;">
              This automated monitoring alert was generated by the Bhuwanta Production Server
              ${payload.triggeredBy ? `(Triggered by: <strong>${escapeHtml(payload.triggeredBy)}</strong>)` : ''}.
            </p>

            <!-- Monitoring Logs Table -->
            <div style="overflow-x: auto; border: 1px solid #E2E8F0; border-radius: 6px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; background-color: #FFFFFF;">
                <thead>
                  <tr style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
                    <th style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Timestamp (IST)</th>
                    <th style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Subsystem</th>
                    <th style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Status</th>
                    <th style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Operational Details</th>
                    <th style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Action Required</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>

            <!-- Dashboard Link & Instructions -->
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 16px; margin-top: 16px;">
              <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #0F172A;">Need to update API keys or check recipients?</h4>
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748B;">
                You can manage monitoring alerts, recipients, and system modules directly in the CRM Settings.
              </p>
              <a href="https://bhuwanta.com/crm/modules" style="display: inline-block; background-color: #002935; color: #FFFFFF; text-decoration: none; padding: 8px 16px; border-radius: 4px; font-size: 13px; font-weight: 600;">
                Open CRM Modules Dashboard →
              </a>
            </div>

          </div>

          <!-- Footer -->
          <div style="padding: 16px 24px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8; text-align: center;">
            This email was sent by the Bhuwanta System Monitoring Engine to configured alert recipients.
          </div>

        </div>
      </body>
    </html>
  `
}

/**
 * Dispatch system monitoring alerts via Resend with Redis throttling to prevent alert fatigue.
 */
export async function sendSystemMonitoringAlert(payload: SystemMonitoringPayload): Promise<{
  sent: boolean
  throttled?: boolean
  recipientsCount?: number
  error?: string
}> {
  try {
    // 1. Throttling Check
    const cooldownKey = payload.cooldownKey
    const cooldownSeconds = payload.cooldownSeconds || 3600 // Default: 1 hour

    if (cooldownKey && !payload.forceSend && redis) {
      const lockKey = `crm:alert_cooldown:${cooldownKey}`
      const isThrottled = await redis.get(lockKey)
      if (isThrottled) {
        console.warn(`[Monitoring] Alert throttled by Redis lock: ${lockKey}`)
        return { sent: false, throttled: true }
      }
      // Set cooldown lock
      await redis.set(lockKey, '1', { ex: cooldownSeconds }).catch(() => {})
    }

    // 2. Resolve Recipients
    const recipients = payload.targetEmails && payload.targetEmails.length > 0
      ? payload.targetEmails
      : await getAlertRecipientsList(true)

    if (!recipients || recipients.length === 0) {
      console.warn('[Monitoring] No alert recipients found to dispatch alert')
      return { sent: false, error: 'No recipients configured' }
    }

    // 3. Prepare Resend Payload
    if (!resend) {
      console.error('[Monitoring] Resend client is unconfigured; cannot deliver system alert')
      return { sent: false, error: 'Resend unconfigured' }
    }

    const hasCritical = payload.items.some(i => i.status === 'CRITICAL')
    const hasWarning = payload.items.some(i => i.status === 'WARNING')
    const prefix = hasCritical ? '🚨 [CRITICAL]' : hasWarning ? '⚠️ [WARNING]' : '📊 [HEALTH]'
    const subject = `${prefix} ${payload.title} — Bhuwanta Monitoring`

    const html = renderMonitoringTableHtml(payload)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@bhuwanta.com'

    const { error: resendError } = await resend.emails.send({
      from: `Bhuwanta Alerts <${fromEmail}>`,
      to: recipients,
      subject,
      html
    })

    if (resendError) {
      console.error('[Monitoring] Failed to send system alert email:', resendError)
      return { sent: false, error: resendError.message }
    }

    // 4. Capture in Sentry if critical
    if (hasCritical) {
      try {
        const Sentry = await import('@sentry/nextjs')
        Sentry.captureMessage(`[System Monitoring Alert] ${payload.title}`, {
          level: 'error',
          extra: { items: payload.items }
        })
      } catch {
        // Sentry is optional
      }
    }

    console.log(`[Monitoring] Dispatched system alert to ${recipients.length} recipients: ${recipients.join(', ')}`)
    return { sent: true, recipientsCount: recipients.length }

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown monitoring alert error'
    console.error('[Monitoring] Unexpected error dispatching alert:', errorMsg)
    return { sent: false, error: errorMsg }
  }
}

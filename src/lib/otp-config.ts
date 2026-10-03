import { redis } from './redis'

const OTP_DOWNLOAD_KEY = 'setting:otp_download_enabled'
const MODULE_KEY = 'website_downloads_otp'

// In-memory fallback if both Redis and Supabase are temporarily unreachable
let memoryOtpDownloadEnabled: boolean = true

export interface OtpConfigState {
  downloadOtpEnabled: boolean
  updatedAt?: string
  updatedBy?: string
}

async function getSupabaseAdmin() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return null
    }
    const { createClient } = await import('@supabase/supabase-js')
    return createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  } catch {
    return null
  }
}

/**
 * Parses raw Redis/DB value (boolean, string, or JSON payload) into a boolean status.
 */
export function parseOtpConfig(raw: unknown, fallback: boolean = true): boolean {
  if (raw === null || raw === undefined) {
    return fallback
  }

  if (typeof raw === 'boolean') {
    return raw
  }

  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase()
    if (lower === 'false' || lower === '0' || lower === 'off' || lower === 'disabled') {
      return false
    }
    if (lower === 'true' || lower === '1' || lower === 'on' || lower === 'enabled') {
      return true
    }
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed?.downloadOtpEnabled === 'boolean') {
        return parsed.downloadOtpEnabled
      }
    } catch {
      // ignore parse error, return fallback
    }
  }

  if (typeof raw === 'object' && raw !== null && 'downloadOtpEnabled' in raw) {
    return Boolean((raw as { downloadOtpEnabled: unknown }).downloadOtpEnabled)
  }

  return fallback
}

/**
 * Gets whether OTP verification is required for public document downloads.
 * Checks Redis cache first, then falls back to Supabase PostgreSQL `s_modules` table.
 */
export async function getOtpDownloadEnabled(): Promise<boolean> {
  // 1. Try Redis cache first for sub-millisecond response
  if (redis) {
    try {
      const raw = await redis.get<unknown>(OTP_DOWNLOAD_KEY)
      if (raw !== null && raw !== undefined) {
        const parsed = parseOtpConfig(raw, memoryOtpDownloadEnabled)
        memoryOtpDownloadEnabled = parsed
        return parsed
      }
    } catch (error) {
      console.warn('[otp-config] Redis get error, querying database:', error)
    }
  }

  // 2. Query Supabase Database (s_modules table)
  try {
    const supabase = await getSupabaseAdmin()
    if (supabase) {
      const { data, error } = await supabase
        .from('s_modules')
        .select('enabled_roles')
        .eq('module_key', MODULE_KEY)
        .maybeSingle()

      if (!error && data) {
        const isEnabled = Array.isArray(data.enabled_roles) && data.enabled_roles.length > 0
        memoryOtpDownloadEnabled = isEnabled

        // Re-populate Redis cache
        if (redis) {
          const payload: OtpConfigState = {
            downloadOtpEnabled: isEnabled,
            updatedAt: new Date().toISOString(),
          }
          await redis.set(OTP_DOWNLOAD_KEY, JSON.stringify(payload)).catch(() => {})
        }

        return isEnabled
      }
    }
  } catch (dbError) {
    console.warn('[otp-config] Supabase query error, using fallback:', dbError)
  }

  return memoryOtpDownloadEnabled
}

/**
 * Sets whether OTP verification is required for public document downloads.
 * Persists to Supabase `s_modules` table AND synchronizes with Upstash Redis cache.
 */
export async function setOtpDownloadEnabled(enabled: boolean, updatedBy?: string): Promise<boolean> {
  memoryOtpDownloadEnabled = Boolean(enabled)
  const roles = enabled ? ['public_downloads'] : []
  const now = new Date().toISOString()

  // 1. Persist directly to Supabase PostgreSQL (s_modules table)
  try {
    const supabase = await getSupabaseAdmin()
    if (supabase) {
      const { data: existing } = await supabase
        .from('s_modules')
        .select('id')
        .eq('module_key', MODULE_KEY)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('s_modules')
          .update({
            enabled_roles: roles,
            updated_at: now,
          })
          .eq('module_key', MODULE_KEY)
      } else {
        await supabase
          .from('s_modules')
          .insert({
            module_key: MODULE_KEY,
            module_name: 'Website Downloads OTP Verification',
            description: 'Requires OTP phone verification on public brochure and document downloads.',
            enabled_roles: roles,
            updated_at: now,
          })
      }
    }
  } catch (dbError) {
    console.error('[otp-config] Supabase database update error:', dbError)
  }

  // 2. Synchronize to Redis cache
  if (redis) {
    try {
      const payload: OtpConfigState = {
        downloadOtpEnabled: Boolean(enabled),
        updatedAt: now,
        updatedBy: updatedBy || 'CRM Admin',
      }
      await redis.set(OTP_DOWNLOAD_KEY, JSON.stringify(payload))
    } catch (redisError) {
      console.error('[otp-config] Redis cache sync error:', redisError)
    }
  }

  return memoryOtpDownloadEnabled
}

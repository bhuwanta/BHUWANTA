import { redis } from './redis'

const OTP_DOWNLOAD_KEY = 'setting:otp_download_enabled'

// In-memory fallback if Redis is not configured or temporarily unreachable
let memoryOtpDownloadEnabled: boolean = true

export interface OtpConfigState {
  downloadOtpEnabled: boolean
  updatedAt?: string
  updatedBy?: string
}

/**
 * Parses raw Redis value (boolean, string, or JSON payload) into a boolean status.
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
 * Defaults to true if not configured.
 */
export async function getOtpDownloadEnabled(): Promise<boolean> {
  if (!redis) {
    return memoryOtpDownloadEnabled
  }

  try {
    const raw = await redis.get<unknown>(OTP_DOWNLOAD_KEY)
    const parsed = parseOtpConfig(raw, memoryOtpDownloadEnabled)
    memoryOtpDownloadEnabled = parsed
    return parsed
  } catch (error) {
    console.warn('[otp-config] Redis get error, using fallback:', error)
    return memoryOtpDownloadEnabled
  }
}

/**
 * Sets whether OTP verification is required for public document downloads.
 */
export async function setOtpDownloadEnabled(enabled: boolean, updatedBy?: string): Promise<boolean> {
  memoryOtpDownloadEnabled = Boolean(enabled)

  if (!redis) {
    return memoryOtpDownloadEnabled
  }

  try {
    const payload: OtpConfigState = {
      downloadOtpEnabled: Boolean(enabled),
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'CRM Admin',
    }
    await redis.set(OTP_DOWNLOAD_KEY, JSON.stringify(payload))
    return memoryOtpDownloadEnabled
  } catch (error) {
    console.error('[otp-config] Redis set error:', error)
    return memoryOtpDownloadEnabled
  }
}

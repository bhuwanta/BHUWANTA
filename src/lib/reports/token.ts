import { createHmac, timingSafeEqual } from 'node:crypto'
import { getSiteUrl } from '@/lib/site-url'

export interface ReportTokenPayload {
  slotCode: string
  period: string
  sheetName: string
  startUtc: string
  endUtc: string
  isMaster: boolean
  todayStr: string
  exp: number
}

function getSigningSecret(): string {
  const secret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'bhuwanta_report_secret_key'
  return secret
}

export function generateReportToken(
  data: Omit<ReportTokenPayload, 'exp'>,
  ttlHours = 24
): string {
  const payload: ReportTokenPayload = {
    ...data,
    exp: Date.now() + ttlHours * 60 * 60 * 1000,
  }
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', getSigningSecret())
    .update(payloadBase64)
    .digest('base64url')

  return `${payloadBase64}.${signature}`
}

export function verifyReportToken(token: string): { valid: true; payload: ReportTokenPayload } | { valid: false; reason: 'expired' | 'invalid' } {
  try {
    if (!token || !token.includes('.')) return { valid: false, reason: 'invalid' }
    const [payloadBase64, signature] = token.split('.')
    if (!payloadBase64 || !signature) return { valid: false, reason: 'invalid' }

    const expectedSignature = createHmac('sha256', getSigningSecret())
      .update(payloadBase64)
      .digest('base64url')

    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expectedSignature)
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, reason: 'invalid' }
    }

    const payload: ReportTokenPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'))
    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false, reason: 'expired' }
    }

    return { valid: true, payload }
  } catch {
    return { valid: false, reason: 'invalid' }
  }
}

export function buildReportDownloadUrl(data: Omit<ReportTokenPayload, 'exp'>): string {
  const token = generateReportToken(data)
  return `${getSiteUrl()}/api/crm/reports/download?token=${encodeURIComponent(token)}`
}

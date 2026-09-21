import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyWhatsAppSignature(body: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false
  return timingSafeEqual(createHmac('sha256', secret).update(body).digest(), Buffer.from(signature.slice(7), 'hex'))
}

const bounded = (value: unknown, length = 4096): string => typeof value === 'string' ? value.slice(0, length) : ''

export function incomingEvidence(message: {
  id?: unknown; timestamp?: unknown; type?: unknown;
  text?: { body?: unknown };
  interactive?: { list_reply?: { id?: unknown; title?: unknown }; button_reply?: { id?: unknown; title?: unknown } };
  referral?: { source_id?: unknown; source_type?: unknown; ctwa_clid?: unknown };
}): string {
  const reply = message.interactive?.list_reply || message.interactive?.button_reply
  const lines = [
    `Message ID: ${bounded(message.id, 512)}`,
    `Provider timestamp: ${bounded(message.timestamp, 32)}`,
    `Type: ${bounded(message.type, 40)}`,
    `Message: ${bounded(message.text?.body) || bounded(reply?.title) || '(no text content)'}`,
  ]
  if (reply?.id) lines.push(`Selection: ${bounded(reply.id, 512)}`)
  if (message.referral) {
    lines.push(`WhatsApp referral source type: ${bounded(message.referral.source_type, 80)}`)
    lines.push(`WhatsApp referral source ID: ${bounded(message.referral.source_id, 512)}`)
    if (message.referral.ctwa_clid) lines.push(`Click-to-WhatsApp ID: ${bounded(message.referral.ctwa_clid, 512)}`)
  }
  lines.push('Acquisition source and buying interest require verification.')
  return lines.join('\n')
}

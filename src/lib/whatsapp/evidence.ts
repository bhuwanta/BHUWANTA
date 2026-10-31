import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyWhatsAppSignature(body: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false
  return timingSafeEqual(createHmac('sha256', secret).update(body).digest(), Buffer.from(signature.slice(7), 'hex'))
}

const bounded = (value: unknown, length = 4096): string => typeof value === 'string' ? value.slice(0, length) : ''

export function incomingEvidence(message: {
  id?: unknown; timestamp?: unknown; type?: unknown;
  text?: { body?: unknown };
  button?: { text?: unknown; payload?: unknown };
  interactive?: {
    type?: unknown;
    list_reply?: { id?: unknown; title?: unknown; description?: unknown };
    button_reply?: { id?: unknown; title?: unknown };
  };
  image?: { id?: unknown; mime_type?: unknown; caption?: unknown };
  video?: { id?: unknown; mime_type?: unknown; caption?: unknown };
  document?: { id?: unknown; mime_type?: unknown; filename?: unknown; caption?: unknown };
  location?: { name?: unknown; address?: unknown; latitude?: unknown; longitude?: unknown };
  audio?: { id?: unknown; mime_type?: unknown } | unknown;
  referral?: { headline?: unknown; body?: unknown; source_id?: unknown; source_type?: unknown; ctwa_clid?: unknown };
}): string {
  const reply = message.interactive?.list_reply || message.interactive?.button_reply

  // Extract meaningful message content across all Meta WhatsApp formats
  let content = bounded(message.text?.body)
  if (!content && message.button?.text) {
    content = bounded(message.button.text)
  }
  if (!content && reply?.title) {
    content = bounded(reply.title)
  }
  if (!content && message.image) {
    content = message.image.caption ? `📷 [Photo: ${bounded(message.image.caption)}]` : '📷 [Photo attachment]'
  }
  if (!content && message.video) {
    content = message.video.caption ? `🎥 [Video: ${bounded(message.video.caption)}]` : '🎥 [Video attachment]'
  }
  if (!content && message.document) {
    content = message.document.filename ? `📄 [Document: ${bounded(message.document.filename)}]` : '📄 [Document attachment]'
  }
  if (!content && message.location) {
    const locName = bounded(message.location.name || message.location.address)
    content = locName ? `📍 [Location: ${locName}]` : '📍 [Location shared]'
  }
  if (!content && message.audio) {
    content = '🎤 [Voice message]'
  }
  if (!content && message.referral?.headline) {
    content = `[Ad: ${bounded(message.referral.headline)}]`
  }
  if (!content && message.referral?.body) {
    content = `[Ad: ${bounded(message.referral.body)}]`
  }
  if (!content && message.type === 'unsupported') {
    content = 'Chat Initiated (Ad CTA / Interactive Button)'
  }

  const lines = [
    `Message ID: ${bounded(message.id, 512)}`,
    `Provider timestamp: ${bounded(message.timestamp, 32)}`,
    `Type: ${bounded(message.type, 40)}`,
    `Message: ${content || '(no text content)'}`,
  ]
  const audioObj = typeof message.audio === 'object' && message.audio !== null ? (message.audio as { id?: unknown; mime_type?: unknown }) : undefined
  const mediaId = message.image?.id || message.video?.id || message.document?.id || audioObj?.id
  const mimeType = message.image?.mime_type || message.video?.mime_type || message.document?.mime_type || audioObj?.mime_type
  if (mediaId) lines.push(`Media ID: ${bounded(mediaId, 128)}`)
  if (mimeType) lines.push(`MIME: ${bounded(mimeType, 100)}`)
  if (reply?.id) lines.push(`Selection: ${bounded(reply.id, 512)}`)
  if (message.button?.payload) lines.push(`Button payload: ${bounded(message.button.payload, 512)}`)
  if (message.referral) {
    if (message.referral.headline) lines.push(`Ad headline: ${bounded(message.referral.headline, 256)}`)
    lines.push(`WhatsApp referral source type: ${bounded(message.referral.source_type, 80)}`)
    lines.push(`WhatsApp referral source ID: ${bounded(message.referral.source_id, 512)}`)
    if (message.referral.ctwa_clid) lines.push(`Click-to-WhatsApp ID: ${bounded(message.referral.ctwa_clid, 512)}`)
  }
  lines.push('Acquisition source and buying interest require verification.')
  return lines.join('\n')
}

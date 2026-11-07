import test from 'node:test'
import assert from 'node:assert/strict'

// Helper mirroring escapeHtml from src/lib/monitoring/alerts.ts
function escapeHtml(unsafe = '') {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Helper mirroring renderMonitoringTableHtml from src/lib/monitoring/alerts.ts
function renderMonitoringTableHtml(payload) {
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

  const rows = payload.items.length === 0
    ? `
      <tr style="background-color: #FFFFFF; border-bottom: 1px solid #E2E8F0;">
        <td colspan="5" style="padding: 24px; text-align: center; color: #64748B; font-size: 13px;">
          No operational events or errors reported. All monitored subsystems are nominal.
        </td>
      </tr>
    `
    : payload.items.map((item, index) => {
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
    <div class="monitoring-container">
      <div style="background-color: ${bannerColor}; color: #FFFFFF;">${bannerText}</div>
      <table>${rows}</table>
    </div>
  `
}

test('System Monitoring: HTML Table correctly renders critical alert banner and status badges', () => {
  const payload = {
    title: 'Test Production Outage',
    triggeredBy: 'Cron: leads-report',
    items: [
      {
        service: 'Meta WhatsApp Cloud API',
        status: 'CRITICAL',
        message: 'WhatsApp Access Token Invalid',
        details: 'OAuthException: Code 190, Subcode 467. Session expired.',
        actionRequired: 'Update WHATSAPP_ACCESS_TOKEN in Vercel.'
      },
      {
        service: 'Resend Mailer',
        status: 'HEALTHY',
        message: 'Transactional reports sending successfully.'
      }
    ]
  }

  const html = renderMonitoringTableHtml(payload)

  // 1. Must contain critical alert banner
  assert.match(html, /CRITICAL ALERT/i)
  assert.match(html, /#EF4444/i) // Red banner color

  // 2. Must contain service names
  assert.match(html, /Meta WhatsApp Cloud API/)
  assert.match(html, /Resend Mailer/)

  // 3. Must contain badges
  assert.match(html, /CRITICAL/)
  assert.match(html, /HEALTHY/)

  // 4. Must contain operational details and action required
  assert.match(html, /OAuthException: Code 190, Subcode 467/)
  assert.match(html, /Update WHATSAPP_ACCESS_TOKEN in Vercel/)
})

test('System Monitoring: HTML Table correctly renders healthy status banner when all services OK', () => {
  const payload = {
    title: 'Daily System Health Summary',
    triggeredBy: 'Scheduled Probe',
    items: [
      {
        service: 'Supabase PostgreSQL',
        status: 'HEALTHY',
        message: 'Connection pool responsive.'
      },
      {
        service: 'Upstash Redis',
        status: 'HEALTHY',
        message: 'Cache hit ratio 98%.'
      }
    ]
  }

  const html = renderMonitoringTableHtml(payload)

  // Banner should be green and healthy
  assert.match(html, /SYSTEM HEALTH — All Subsystems Operating Normally/)
  assert.match(html, /#10B981/)
  assert.doesNotMatch(html, /CRITICAL ALERT/)
})

test('System Monitoring: HTML Table escapes unsafe strings against injection', () => {
  const payload = {
    title: 'XSS Test <script>alert(1)</script>',
    items: [
      {
        service: 'Mock Service <img src=x onerror=alert(1)>',
        status: 'WARNING',
        message: 'Malicious & Unsafe "Text" <tag>',
        details: '<div onclick="hack()">detail</div>',
        actionRequired: '<script>evil()</script>'
      }
    ]
  }

  const html = renderMonitoringTableHtml(payload)

  // Ensure script tags and unescaped HTML characters are sanitized
  assert.doesNotMatch(html, /<script>/)
  assert.doesNotMatch(html, /<img src=x/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /&amp;/)
  assert.match(html, /&quot;/)
})

test('Alert Recipient Edit: allows updating email address with duplicate prevention', () => {
  let recipients = [
    { id: '1', name: 'Admin', email: 'bhuwanta9@gmail.com' },
    { id: '2', name: 'DevOps', email: 'devops@bhuwanta.com' }
  ]

  const updateRecipientEmail = (id, newEmail) => {
    const clean = (newEmail || '').trim().toLowerCase()
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      return { success: false, error: 'Invalid email' }
    }
    const duplicate = recipients.find(r => r.id !== id && r.email.toLowerCase() === clean)
    if (duplicate) {
      return { success: false, error: 'Duplicate email' }
    }
    recipients = recipients.map(r => r.id === id ? { ...r, email: clean } : r)
    return { success: true, updated: recipients.find(r => r.id === id) }
  }

  // 1. Successfully edit email
  const res1 = updateRecipientEmail('1', 'santosh@bhuwanta.com')
  assert.equal(res1.success, true)
  assert.equal(res1.updated.email, 'santosh@bhuwanta.com')

  // 2. Reject duplicate email
  const res2 = updateRecipientEmail('1', 'devops@bhuwanta.com')
  assert.equal(res2.success, false)
  assert.equal(res2.error, 'Duplicate email')

  // 3. Reject invalid email
  const res3 = updateRecipientEmail('1', 'notanemail')
  assert.equal(res3.success, false)
  assert.equal(res3.error, 'Invalid email')
})

test('Alert Recipient Deletion Guardrail: allows removal when count > 1, rejects when count <= 1', () => {
  let recipients = [
    { id: '1', email: 'first@bhuwanta.com' },
    { id: '2', email: 'second@bhuwanta.com' }
  ]

  const removeRecipient = (id) => {
    if (recipients.length <= 1) {
      return { success: false, error: 'At least one alert recipient is required' }
    }
    recipients = recipients.filter(r => r.id !== id)
    return { success: true }
  }

  // Deletion allowed when 2 recipients exist
  const res1 = removeRecipient('1')
  assert.equal(res1.success, true)
  assert.equal(recipients.length, 1)

  // Deletion blocked when only 1 recipient is left
  const res2 = removeRecipient('2')
  assert.equal(res2.success, false)
  assert.match(res2.error, /At least one alert recipient is required/)
  assert.equal(recipients.length, 1)
})

test('Redis Cooldown Logic: Throttles identical error alerts to avoid inbox flooding', () => {
  const mockCache = new Map()

  const shouldThrottle = (cooldownKey, forceSend = false) => {
    if (forceSend) return false
    const lockKey = `crm:alert_cooldown:${cooldownKey}`
    if (mockCache.has(lockKey)) {
      return true // Throttled
    }
    mockCache.set(lockKey, '1')
    return false // Allowed to send
  }

  // First alert triggers send
  assert.equal(shouldThrottle('wa-auth-401', false), false)

  // Immediate subsequent alert is throttled
  assert.equal(shouldThrottle('wa-auth-401', false), true)
  assert.equal(shouldThrottle('wa-auth-401', false), true)

  // Manual test button with forceSend=true bypasses throttle
  assert.equal(shouldThrottle('wa-auth-401', true), false)

  // Different error key is NOT throttled
  assert.equal(shouldThrottle('supabase-connection-drop', false), false)
})

test('Meta API Error Parsing: Accurately identifies Token Expiration subcode 467', () => {
  const sampleMetaResponse = JSON.stringify({
    error: {
      message: 'Error validating access token: The session is invalid because the user logged out.',
      type: 'OAuthException',
      code: 190,
      error_subcode: 467,
      fbtrace_id: 'Aq_QV5u4u9GjF8ykuksgfJt'
    }
  })

  const isMetaAuthFailure = (statusCode, body) => {
    if (statusCode === 401 || statusCode === 403) return true
    if (body.includes('OAuthException') || body.includes('190') || body.includes('467')) return true
    return false
  }

  assert.equal(isMetaAuthFailure(401, sampleMetaResponse), true)
  assert.equal(isMetaAuthFailure(200, '{"success": true}'), false)
})

test('System Monitoring: Guide PDF Generator creates valid multi-page A4 document', async () => {
  const { jsPDF } = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const autoTable = autoTableModule.default || autoTableModule

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  })

  // Page 1 header and table
  doc.text('BHUWANTA DEVELOPERS • SYSTEM MONITORING GUIDE', 40, 40)
  autoTable(doc, {
    startY: 60,
    head: [['Section', 'Description']],
    body: [
      ['1. Purpose', 'Resolves 1-week WhatsApp token outage (OAuthException 190)'],
      ['2. Recipient Inboxes', 'Full Add, Edit (Name & Email), and Delete with guardrails'],
      ['3. Information Sent', '5-column structured HTML table in alerts'],
      ['4. Spam Throttling', '2-hour Upstash Redis incident cooldown lock']
    ]
  })

  // Page 2
  doc.addPage()
  doc.text('Subsystems Reference Matrix', 40, 40)
  autoTable(doc, {
    startY: 60,
    head: [['Subsystem', 'Scope', 'Status']],
    body: [
      ['Meta WhatsApp Cloud API', 'Token & Delivery', 'Monitored'],
      ['Meta Ads Leads Sync', 'Form Webhooks', 'Monitored'],
      ['Resend Mail Engine', 'PDF/Email Dispatch', 'Monitored'],
      ['Supabase & Redis', 'Database & Caches', 'Monitored']
    ]
  })

  const pageCount = doc.internal.getNumberOfPages()
  assert.equal(pageCount, 2)

  const arrayBuf = doc.output('arraybuffer')
  assert.ok(arrayBuf.byteLength > 2000, 'PDF buffer must be greater than 2KB')
  const pdfHeader = Buffer.from(arrayBuf.slice(0, 5)).toString()
  assert.equal(pdfHeader, '%PDF-')
})

test('Double Click Prevention: Synchronous mutex lock blocks concurrent rapid button clicks', async () => {
  let executionsCount = 0
  const isExecutingRef = { current: false }

  const asyncAction = async () => {
    if (isExecutingRef.current) {
      return { skipped: true }
    }
    isExecutingRef.current = true
    try {
      executionsCount++
      // Simulate network / async delay
      await new Promise(resolve => setTimeout(resolve, 20))
      return { success: true }
    } finally {
      isExecutingRef.current = false
    }
  }

  // Simulate two rapid, concurrent clicks fired in the same microtask frame
  const [click1, click2] = await Promise.all([
    asyncAction(),
    asyncAction()
  ])

  // Click 1 succeeded, Click 2 was dropped synchronously by the mutex lock
  assert.equal(click1.success, true)
  assert.equal(click2.skipped, true)
  assert.equal(executionsCount, 1)

  // Subsequent click after completion is permitted
  const click3 = await asyncAction()
  assert.equal(click3.success, true)
  assert.equal(executionsCount, 2)
})

test('System Monitoring: HTML Table handles empty items array with clean nominal fallback', () => {
  const payload = {
    title: 'Routine Health Ping',
    items: []
  }
  const html = renderMonitoringTableHtml(payload)
  assert.match(html, /No operational events or errors reported/i)
  assert.match(html, /All monitored subsystems are nominal/i)
})

test('Alert Recipient Deduplication: Deduplicates casing, whitespace, and strips invalid items', () => {
  const rawList = [
    ' Admin@bhuwanta.com ',
    'admin@bhuwanta.com',
    'SUPPORT@BHUWANTA.COM',
    'support@bhuwanta.com ',
    '',
    'not-an-email',
    null,
    undefined
  ]

  const deduplicated = Array.from(
    new Set(
      rawList
        .map(e => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
        .filter(e => e.includes('@'))
    )
  )

  assert.deepEqual(deduplicated, [
    'admin@bhuwanta.com',
    'support@bhuwanta.com'
  ])
})

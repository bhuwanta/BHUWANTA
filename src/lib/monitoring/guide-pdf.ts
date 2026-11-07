import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Generates an executive, publication-grade PDF of the Bhuwanta System Monitoring & Alerts Guide.
 * Can be used in both browser (triggers file download) and server/testing environments (returns Buffer).
 */
export async function generateMonitoringGuidePdf(options?: { download?: boolean }): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight() // 841.89 pt
  const marginX = 40
  const contentWidth = pageWidth - marginX * 2 // 515.28 pt
  const nowIst = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  // Helper for adding footer on all pages
  const addPageFooters = () => {
    const totalPages = (doc.internal as any).getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setDrawColor(226, 232, 240) // #e2e8f0
      doc.setLineWidth(0.75)
      doc.line(marginX, pageHeight - 35, pageWidth - marginX, pageHeight - 35)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184) // #94a3b8
      doc.text('Bhuwanta CRM • System Monitoring & Observability Documentation', marginX, pageHeight - 22)
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 22, { align: 'right' })
    }
  }

  // -------------------------------------------------------------
  // PAGE 1: Header, Architecture Problem, & Recipient Management
  // -------------------------------------------------------------

  // Top Accent Banner
  doc.setFillColor(0, 41, 53) // Navy #002935
  doc.rect(0, 0, pageWidth, 70, 'F')

  doc.setFillColor(196, 165, 90) // Gold #c4a55a
  doc.rect(0, 70, pageWidth, 3.5, 'F')

  // Top Header Text
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(196, 165, 90) // Gold
  doc.text('BHUWANTA DEVELOPERS CRM • INFRASTRUCTURE & OBSERVABILITY', marginX, 28)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('System Monitoring & Failure Alerts Guide', marginX, 48)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(203, 213, 225) // Slate 300
  doc.text(`Generated: ${nowIst} IST  •  Environment: Production  •  Doc Version: 2.0`, marginX, 60)

  let cursorY = 96

  // Section 1: Overview & The 1-Week Outage Solved
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 29, 51) // Slate 900
  doc.text('1. Overview & The 1-Week Silent Outage Solved', marginX, cursorY)
  cursorY += 14

  // Highlight Box: The Outage Incident
  doc.setFillColor(254, 242, 242) // Red 50
  doc.roundedRect(marginX, cursorY, contentWidth, 54, 4, 4, 'F')
  doc.setDrawColor(254, 202, 202) // Red 200
  doc.setLineWidth(0.75)
  doc.roundedRect(marginX, cursorY, contentWidth, 54, 4, 4, 'D')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(153, 27, 27) // Red 800
  doc.text('The Real Incident: WhatsApp Access Token Revocation (Subcode 467)', marginX + 12, cursorY + 16)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(185, 28, 28) // Red 700
  const incidentText =
    'For an entire week, automated WhatsApp scheduled reports failed silently. Meta had revoked the token with OAuthException Code 190 (Subcode 467 - User session logged out). Standard tools like Sentry and cron-job.org did not catch it because fetch() returns an HTTP 401 response without throwing an unhandled exception, and the cron route returned HTTP 200 OK.'
  doc.text(doc.splitTextToSize(incidentText, contentWidth - 24), marginX + 12, cursorY + 29)
  cursorY += 66

  // Architecture Pillars
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 29, 51)
  doc.text('How the Monitoring Engine Fixes This:', marginX, cursorY)
  cursorY += 12

  const pillars = [
    {
      title: 'Active HTTP Interception',
      desc: 'All third-party API calls (Meta, Supabase, Resend) actively inspect HTTP status codes. On 4xx/5xx or token expiration, an immediate alert is triggered.'
    },
    {
      title: 'HTTP 502 Bad Gateway for Uptime Monitors',
      desc: 'Cron endpoints fail loudly with HTTP 502 rather than returning 200 OK, causing external uptime schedulers (like cron-job.org) to immediately turn Red.'
    },
    {
      title: 'Dedicated Alert Inbox Routing',
      desc: 'Alerts are dispatched directly to designated engineer/admin emails, completely decoupled from customer lead notifications.'
    },
    {
      title: 'Human-Readable Tabular Digest',
      desc: 'Alerts are delivered as high-legibility HTML tables detailing timestamp, subsystem, severity badge, diagnostics, and remediation steps.'
    }
  ]

  pillars.forEach(p => {
    doc.setFillColor(0, 41, 53)
    doc.circle(marginX + 4, cursorY - 3, 2, 'F')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 41, 53)
    doc.text(p.title + ': ', marginX + 12, cursorY)
    const titleWidth = doc.getTextWidth(p.title + ': ')
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    const splitDesc = doc.splitTextToSize(p.desc, contentWidth - 12 - titleWidth)
    doc.text(splitDesc[0], marginX + 12 + titleWidth, cursorY)
    if (splitDesc.length > 1) {
      cursorY += 10
      doc.text(splitDesc.slice(1), marginX + 12, cursorY)
    }
    cursorY += 13
  })
  cursorY += 6

  // Section 2: Recipient Management (Add, Edit, Delete)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 29, 51)
  doc.text('2. Managing Alert Recipients (Add, Edit Email, & Delete)', marginX, cursorY)
  cursorY += 14

  const managementSteps = [
    [
      'Adding Recipient',
      'Click "+ Add Alert Email" in the top-right corner. Enter the recipient name and email address. Select whether to receive Instant Critical Alerts (immediate on token failure/DB crash), Tabular Cron Digests, or both. Click Add Recipient.'
    ],
    [
      'Editing Name & Email',
      'Click the Pencil Icon (Edit) on any row. Both Name and Email Address are fully editable inputs. You can modify notification checkboxes or replace the email address (e.g. updating bhuwanta9@gmail.com with your personal email) and click Save.'
    ],
    [
      'Removing Recipient',
      'Click the Trash Icon (Delete) on any row. To guarantee the system is never left in an unmonitored silent state, at least 1 active recipient is maintained. When 2+ recipients exist, any recipient can be deleted immediately.'
    ],
    [
      'Live Test Verification',
      'Click "Test Alert" in any recipient row to immediately generate and dispatch a simulated 5-column health table to that exact inbox. Manual test alerts always bypass cooldown locks.'
    ]
  ]

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [['Action / Feature', 'Operational Instructions & Behavior']],
    body: managementSteps,
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold', textColor: [0, 41, 53] },
      1: { cellWidth: 'auto', textColor: [51, 65, 85] }
    },
    styles: {
      fontSize: 8,
      cellPadding: 6,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [0, 41, 53],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.5
  })

  // -------------------------------------------------------------
  // PAGE 2: Alert Table Structure, Spam Throttling, & Subsystems
  // -------------------------------------------------------------
  doc.addPage()

  // Page 2 Mini Header
  doc.setFillColor(0, 41, 53)
  doc.rect(0, 0, pageWidth, 36, 'F')
  doc.setFillColor(196, 165, 90)
  doc.rect(0, 36, pageWidth, 2.5, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('BHUWANTA CRM • SYSTEM MONITORING & ALERTS SPECIFICATION', marginX, 22)

  cursorY = 56

  // Section 3: Alert Email Structure
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 29, 51)
  doc.text('3. What Information Is Sent in Alert Emails', marginX, cursorY)
  cursorY += 10

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text('Every email alert contains a responsive 5-column operational table structured as follows:', marginX, cursorY)
  cursorY += 10

  const tableSpec = [
    ['Timestamp (IST)', 'Exact date and time the health probe or cron executed in Indian Standard Time (+05:30).', '07 Nov 2026, 01:30 PM'],
    ['Subsystem', 'The specific production service probed (Meta WhatsApp API, Meta Ads, Supabase, Resend).', 'Meta WhatsApp Cloud API'],
    ['Status Badge', 'Color-coded severity badge: HEALTHY (Green), WARNING (Yellow), CRITICAL (Red).', 'CRITICAL (Red Badge)'],
    ['Operational Details', 'Diagnostic information including HTTP status code, error type, and Meta/database trace IDs.', 'OAuthException: Code 190, Subcode 467'],
    ['Action Required', 'Direct, actionable remediation instructions on how to restore service.', 'Generate Permanent Token in Meta Business Suite']
  ]

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [['Column', 'Description & Purpose', 'Example Data']],
    body: tableSpec,
    columnStyles: {
      0: { cellWidth: 95, fontStyle: 'bold', textColor: [0, 41, 53] },
      1: { cellWidth: 260, textColor: [51, 65, 85] },
      2: { cellWidth: 'auto', fontStyle: 'italic', textColor: [100, 116, 139] }
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 5.5,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [0, 41, 53],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.5
  })

  cursorY = (doc as any).lastAutoTable.finalY + 18

  // Section 4: Spam Protection & Redis Cooldown
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 29, 51)
  doc.text('4. Upstash Redis Cooldown Throttling (Spam Prevention)', marginX, cursorY)
  cursorY += 14

  // Cooldown explanation card
  doc.setFillColor(248, 250, 252) // Slate 50
  doc.roundedRect(marginX, cursorY, contentWidth, 54, 4, 4, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.75)
  doc.roundedRect(marginX, cursorY, contentWidth, 54, 4, 4, 'D')

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 41, 53)
  doc.text('Preventing 96 Duplicate Emails Per Day During Outages', marginX + 12, cursorY + 16)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  const spamDesc =
    'If a recurring cron runs every 15 minutes and an external API token expires, naive alert systems would send 96 emails every 24 hours, causing alert fatigue. The monitoring engine acquires a temporary incident lock in Upstash Redis (crm:alert_cooldown:...) with a 2-hour Time-to-Live (TTL). You receive an immediate alert on the first failure, identical failures within 2 hours are suppressed, and 1 reminder is dispatched if still active after 2 hours.'
  doc.text(doc.splitTextToSize(spamDesc, contentWidth - 24), marginX + 12, cursorY + 28)
  cursorY += 66

  // Section 5: Monitored Production Subsystems Matrix
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 29, 51)
  doc.text('5. Monitored Subsystems Reference Matrix', marginX, cursorY)
  cursorY += 10

  const subsystems = [
    [
      'Meta WhatsApp Cloud API',
      'Validates Permanent System User Token session, phone registration, and template delivery.',
      'Active token (subcode 0), HTTP 200 response.',
      'Token expired (Code 190 / 467), rate limiting (Code 80007).'
    ],
    [
      'Meta Ads Leads Gen Sync',
      'Probes /api/cron/meta-sync for webhook delivery and active lead form synchronizations.',
      'Sync cycle completed with 0 errors.',
      'Page access revoked, missing permissions, ad account suspended.'
    ],
    [
      'Resend Transactional Mail',
      'Delivers PDF/Excel lead reports and urgent system alert emails.',
      'Verified domain bhuwanta.com with active DKIM/SPF.',
      'API key invalidated, monthly sending limit reached, DNS failure.'
    ],
    [
      'Supabase & Upstash Redis',
      'Database connection pool latency and Redis in-memory session cache responsiveness.',
      'Query latency < 30ms, Redis PING returning PONG.',
      'PostgreSQL connection pool exhausted, Redis memory limit reached.'
    ]
  ]

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [['Subsystem', 'Operational Scope', 'Healthy Indicator', 'Typical Degradation Mode']],
    body: subsystems,
    columnStyles: {
      0: { cellWidth: 95, fontStyle: 'bold', textColor: [0, 41, 53] },
      1: { cellWidth: 155, textColor: [51, 65, 85] },
      2: { cellWidth: 125, textColor: [16, 185, 129] }, // Green
      3: { cellWidth: 'auto', textColor: [185, 28, 28] }  // Red
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 5.5,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [0, 41, 53],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.5
  })

  // Add Footers to all pages
  addPageFooters()

  // Trigger client-side download if requested
  if (options?.download !== false && typeof window !== 'undefined') {
    doc.save('Bhuwanta_System_Monitoring_Guide.pdf')
  }

  return doc
}

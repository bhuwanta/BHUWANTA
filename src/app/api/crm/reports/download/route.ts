import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyReportToken } from '@/lib/reports/token'
import { generateExcelBuffer, generateMasterExcelBuffer, formatLead } from '@/lib/reports/generator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

function renderExpiredHtml(message: string) {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Bhuwanta CRM - Report Link</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f1d33; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px; max-width: 440px; width: 100%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: center; }
    .icon { font-size: 40px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 10px; color: #0f1d33; }
    p { font-size: 14px; color: #64748b; line-height: 1.5; margin: 0 0 24px; }
    .btn { display: inline-block; background: #0f1d33; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: background 0.2s; }
    .btn:hover { background: #1e3a5f; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>Link Expired or Invalid</h1>
    <p>${message}</p>
    <a href="/crm/leads" class="btn">Open Bhuwanta CRM</a>
  </div>
</body>
</html>`,
    {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  )
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return renderExpiredHtml('Missing security token. Please use the download link provided in your automated WhatsApp report.')
    }

    const verification = verifyReportToken(token)
    if (!verification.valid) {
      if (verification.reason === 'expired') {
        return renderExpiredHtml('For your security, automated WhatsApp report download links expire after 24 hours.<br/><br/>Please log in to the Bhuwanta CRM dashboard to export historical leads.')
      }
      return renderExpiredHtml('Invalid security token. This download link could not be verified.')
    }

    const payload = verification.payload
    let excelBuffer: Buffer
    let filename: string

    if (payload.isMaster) {
      const { data: allTimeLeads, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching leads for master report download:', error)
        return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
      }

      const allTime = (allTimeLeads || []).map(formatLead)
      const slotLeads = (allTimeLeads || [])
        .filter((l: any) => l.created_at >= payload.startUtc && (!payload.endUtc || l.created_at <= payload.endUtc))
        .map(formatLead)

      const startOfTodayUtc = new Date(`${payload.todayStr}T00:00:00+05:30`).toISOString()
      const todayLeads = (allTimeLeads || [])
        .filter((l: any) => l.created_at >= startOfTodayUtc)
        .map(formatLead)

      excelBuffer = generateMasterExcelBuffer(slotLeads, todayLeads, allTime, payload.sheetName)
      filename = `Bhuwanta_Leads_Master_Report_${payload.todayStr}.xlsx`
    } else {
      let query = supabase
        .from('leads')
        .select('*')
        .gte('created_at', payload.startUtc)

      if (payload.endUtc) {
        query = query.lte('created_at', payload.endUtc)
      }

      const { data: leads, error } = await query.order('created_at', { ascending: false })
      if (error) {
        console.error('Error fetching leads for slot report download:', error)
        return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
      }

      const reportData = (leads || []).map(formatLead)
      excelBuffer = generateExcelBuffer(reportData, payload.sheetName)
      filename = `Bhuwanta_Leads_Report_${payload.todayStr}_Slot_${payload.slotCode}.xlsx`
    }

    return new NextResponse(excelBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('Error in report download route:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

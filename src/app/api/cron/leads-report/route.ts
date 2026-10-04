import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { generateExcelBuffer, generatePDFBuffer, LeadReportData } from '@/lib/reports/generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function formatLead(lead: any): LeadReportData {
  return {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    source: lead.source_page || 'Unknown',
    message: lead.message || '-',
    project: lead.project || '-',
    downloads: lead.downloaded_item || '-',
    date: new Date(lead.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  };
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET && 
      authHeader !== `Bearer ${process.env.CRON_SECRET}` && 
      process.env.NODE_ENV === 'production'
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nowUtc = new Date();
    const nowIst = new Date(nowUtc.getTime() + (5.5 * 60 * 60 * 1000));

    // Allow ?testHour=6 to simulate a specific IST hour (for testing all slots)
    const url = new URL(request.url);
    const testHourParam = url.searchParams.get('testHour');
    const istHour = testHourParam ? parseInt(testHourParam, 10) : nowIst.getUTCHours();
    
    const midnightIst = new Date(nowIst);
    midnightIst.setUTCHours(0, 0, 0, 0);

    const attachments: any[] = [];
    const dateStr = nowIst.toISOString().split('T')[0];
    let reportPeriod = '';
    let emailHtml = '';

    const getUtcStr = (istDate: Date) => new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000)).toISOString();

    // ── Determine time slot based on current IST hour ──
    // Master reports (6 AM, 6 PM): 3 PDFs — slot leads, today total, all-time
    // Regular reports (9 AM, 12 PM, 3 PM, 9 PM): PDF + Excel for the slot
    let startIst: Date;
    let isMaster = false;

    if (istHour >= 20) {
      // 9 PM Report: 6 PM → 9 PM
      reportPeriod = '9 PM Report (6 PM – 9 PM)';
      startIst = new Date(midnightIst.getTime() + (18 * 60 * 60 * 1000));
    } else if (istHour >= 17) {
      // 6 PM Master Report: 3 PM → 6 PM + today total + all-time
      reportPeriod = '6 PM Master Report';
      startIst = new Date(midnightIst.getTime() + (15 * 60 * 60 * 1000));
      isMaster = true;
    } else if (istHour >= 14) {
      // 3 PM Report: 12 PM → 3 PM
      reportPeriod = '3 PM Report (12 PM – 3 PM)';
      startIst = new Date(midnightIst.getTime() + (12 * 60 * 60 * 1000));
    } else if (istHour >= 11) {
      // 12 PM Report: 9 AM → 12 PM
      reportPeriod = '12 PM Report (9 AM – 12 PM)';
      startIst = new Date(midnightIst.getTime() + (9 * 60 * 60 * 1000));
    } else if (istHour >= 8) {
      // 9 AM Report: 6 AM → 9 AM
      reportPeriod = '9 AM Report (6 AM – 9 AM)';
      startIst = new Date(midnightIst.getTime() + (6 * 60 * 60 * 1000));
    } else {
      // 6 AM Master Report: 9 PM yesterday → 6 AM today
      reportPeriod = '6 AM Master Report (9 PM – 6 AM)';
      startIst = new Date(midnightIst.getTime() - (3 * 60 * 60 * 1000));
      isMaster = true;
    }

    const startUtc = getUtcStr(startIst);

    if (isMaster) {
      // ── Master reports: 3 PDFs (slot + today + all-time) ──
      const { data: allTimeLeads } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (allTimeLeads) {
        const allTime = allTimeLeads.map(formatLead);

        // Slot leads
        const slotLeadsRaw = allTimeLeads.filter((l: any) => l.created_at >= startUtc);

        // Today's leads
        const startOfTodayUtc = getUtcStr(midnightIst);
        const todayLeadsRaw = allTimeLeads.filter((l: any) => l.created_at >= startOfTodayUtc);

        const slotTitle = istHour >= 17
          ? 'Leads (3 PM – 6 PM)'
          : 'Leads (9 PM Yesterday – 6 AM Today)';

        attachments.push({ filename: `1_slot_leads_${dateStr}.pdf`, content: await generatePDFBuffer(slotLeadsRaw.map(formatLead), slotTitle) });
        attachments.push({ filename: `2_total_leads_today_${dateStr}.pdf`, content: await generatePDFBuffer(todayLeadsRaw.map(formatLead), 'Total Leads Today') });
        attachments.push({ filename: `3_total_leads_all_time_${dateStr}.pdf`, content: await generatePDFBuffer(allTime, 'Total Leads All Time') });

        emailHtml = `
          <h2>Bhuwanta ${reportPeriod}</h2>
          <p>Attached are the 3 Master PDF reports.</p>
          ${slotLeadsRaw.length === 0 && todayLeadsRaw.length === 0 ? '<p style="color:red; font-weight:bold;">Notice: No new leads came in during this period.</p>' : ''}
          <ul>
            <li><strong>Slot Leads:</strong> ${slotLeadsRaw.length} leads</li>
            <li><strong>Total Leads Today:</strong> ${todayLeadsRaw.length} leads</li>
            <li><strong>Total Leads All Time:</strong> ${allTime.length} leads</li>
          </ul>
        `;
      }
    } else {
      // ── Regular slot reports: PDF + Excel ──
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', startUtc)
        .order('created_at', { ascending: false });

      const reportData = leads ? leads.map(formatLead) : [];
      const reportTitle = `Bhuwanta Leads - ${reportPeriod}`;

      attachments.push({ filename: `leads_report_${dateStr}.xlsx`, content: generateExcelBuffer(reportData) });
      attachments.push({ filename: `leads_report_${dateStr}.pdf`, content: await generatePDFBuffer(reportData, reportTitle) });

      emailHtml = `
        <h2>Bhuwanta Leads Report</h2>
        <p>Attached is the leads report for <strong>${reportPeriod}</strong>.</p>
        ${reportData.length === 0 ? '<p style="color:red; font-weight:bold;">Notice: No new leads came in during this period.</p>' : ''}
        <p>Total leads in this report: <strong>${reportData.length}</strong></p>
      `;
    }

    if (attachments.length > 0) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'info@bhuwanta.com';
      
      const testEmail = url.searchParams.get('testEmail');
      const testWaPhone = url.searchParams.get('testWaPhone');
      
      // -- 1. Send Emails --
      if (!testWaPhone) { // Skip emails if testing only WA
        let emailList: string[] = ['bhuwanta9@gmail.com'];
        
        if (testEmail) {
          emailList = [testEmail];
        } else {
          const { data: recipients } = await supabase.from('report_recipients').select('email');
          if (recipients && recipients.length > 0) {
            emailList = [...new Set(['bhuwanta9@gmail.com', ...recipients.map(r => r.email)])];
          }
        }

        const { error: emailError } = await resend.emails.send({
          from: `Bhuwanta Reports <${fromEmail}>`,
          to: emailList,
          subject: `[Bhuwanta CRM] ${reportPeriod}${testEmail ? ' (TEST)' : ''}`,
          html: emailHtml + `<br/><p><small>This is an automated system email.</small></p>`,
          attachments
        });

        if (emailError) {
          console.error('Resend Error:', emailError);
          if (testEmail) return NextResponse.json({ error: emailError.message }, { status: 500 });
        }
      }

      // -- 2. Send WhatsApp Messages --
      if (!testEmail) { // Skip WA if testing only email
        let waList: string[] = [];
        if (testWaPhone) {
          waList = [testWaPhone];
        } else {
          const { data: waRecipients } = await supabase.from('whatsapp_report_recipients').select('phone_number');
          if (waRecipients && waRecipients.length > 0) {
            waList = [...new Set(waRecipients.map(r => r.phone_number))];
          }
        }

        if (waList.length > 0) {
          const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
          const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

          if (waToken && waPhoneId) {
            // Upload attachments and send
            for (const phone of waList) {
              // Send summary text first
              const formattedDate = nowIst.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
              const formattedTime = nowIst.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
              const summaryText = `📊 *Automated Bhuwanta CRM Report*\n\n*Date:* ${formattedDate}\n*Time:* ${formattedTime}\n*Period:* ${reportPeriod}\n\nPlease find the attached excel report below.`;
              
              await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${waToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: phone,
                  type: 'text',
                  text: { body: summaryText }
                })
              });

              // Upload and send attachments (ONLY Excel for WhatsApp)
              const excelAttachments = attachments.filter(a => a.filename.endsWith('.xlsx'));
              for (const attachment of excelAttachments) {
                try {
                  const form = new FormData();
                  form.append('messaging_product', 'whatsapp');
                  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                  form.append('file', new Blob([attachment.content], { type: mimeType }), attachment.filename);

                  // Upload
                  const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/media`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${waToken}` },
                    body: form
                  });

                  if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    const mediaId = uploadData.id;

                    // Send document
                    await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${waToken}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: phone,
                        type: 'document',
                        document: {
                          id: mediaId,
                          filename: attachment.filename
                        }
                      })
                    });
                  } else {
                    console.error('WhatsApp Upload failed:', await uploadRes.text());
                  }
                } catch (e) {
                  console.error('Error sending WA attachment:', e);
                }
              }
            }
          } else {
            console.warn('WhatsApp API credentials are not configured.');
            if (testWaPhone) return NextResponse.json({ error: 'WhatsApp API credentials missing' }, { status: 500 });
          }
        }
      }
    }

    return NextResponse.json({ success: true, period: reportPeriod, attachmentsGenerated: attachments.length });
  } catch (err: unknown) {
    console.error('Cron Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { generateExcelBuffer, generateMasterExcelBuffer, generatePDFBuffer, LeadReportData } from '@/lib/reports/generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function formatLead(lead: any): LeadReportData {
  let formattedDate = '-';
  if (lead.created_at) {
    try {
      const d = new Date(lead.created_at);
      const datePart = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' });
      const timePart = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
      formattedDate = `${datePart}, ${timePart}`;
    } catch {
      formattedDate = String(lead.created_at);
    }
  }
  return {
    name: lead.name ? String(lead.name).trim() : 'Unknown',
    phone: lead.phone ? String(lead.phone).trim() : '-',
    email: lead.email ? String(lead.email).trim() : '-',
    source: lead.source_page ? String(lead.source_page).trim() : 'Unknown',
    message: lead.message ? String(lead.message).trim() : '-',
    project: lead.project ? String(lead.project).trim() : '-',
    downloads: lead.downloaded_item ? String(lead.downloaded_item).trim() : '-',
    date: formattedDate
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

    // Helper functions for clean IST formatting (directly from UTC dates, avoiding double-offset)
    const formatIstDate = (d: Date) => d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' });
    const formatIstTime = (d: Date) => d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
    const formatIstDateTime = (d: Date) => `${formatIstDate(d)}, ${formatIstTime(d)}`;

    // Current date and yesterday date in IST (YYYY-MM-DD)
    const todayIstStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(nowUtc);
    const yesterdayUtc = new Date(nowUtc.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayIstStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(yesterdayUtc);

    // Allow ?testHour=6 to simulate a specific IST hour (for testing all slots)
    const url = new URL(request.url);
    const testHourParam = url.searchParams.get('testHour');
    const istHour = testHourParam 
      ? parseInt(testHourParam, 10) 
      : parseInt(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(nowUtc), 10);

    const attachments: any[] = [];
    const dateStr = todayIstStr;
    let reportPeriod = '';
    let slotTitle = '';
    let slotSheetName = '';
    let startSlotDate: Date;
    let endSlotDate: Date;
    let coverageWindowText = '';
    let isMaster = false;
    let emailHtml = '';

    if (istHour >= 20) {
      // 9 PM Report: 6 PM → 9 PM
      reportPeriod = '9 PM Report (6 PM – 9 PM)';
      slotTitle = 'Leads (6 PM – 9 PM)';
      slotSheetName = 'Slot (6 PM - 9 PM)';
      startSlotDate = new Date(`${todayIstStr}T18:00:00+05:30`);
      endSlotDate = new Date(`${todayIstStr}T21:00:00+05:30`);
      coverageWindowText = `${formatIstDateTime(startSlotDate)} – ${formatIstDateTime(endSlotDate)}`;
    } else if (istHour >= 17) {
      // 6 PM Master Report: 3 PM → 6 PM + today total + all-time
      reportPeriod = '6 PM Master Report';
      slotTitle = 'Leads (3 PM – 6 PM)';
      slotSheetName = 'Slot (3 PM - 6 PM)';
      startSlotDate = new Date(`${todayIstStr}T15:00:00+05:30`);
      endSlotDate = new Date(`${todayIstStr}T18:00:00+05:30`);
      isMaster = true;
      coverageWindowText = `${formatIstDateTime(startSlotDate)} – ${formatIstDateTime(endSlotDate)} (Slot) + Today & All-Time Master`;
    } else if (istHour >= 14) {
      // 3 PM Report: 12 PM → 3 PM
      reportPeriod = '3 PM Report (12 PM – 3 PM)';
      slotTitle = 'Leads (12 PM – 3 PM)';
      slotSheetName = 'Slot (12 PM - 3 PM)';
      startSlotDate = new Date(`${todayIstStr}T12:00:00+05:30`);
      endSlotDate = new Date(`${todayIstStr}T15:00:00+05:30`);
      coverageWindowText = `${formatIstDateTime(startSlotDate)} – ${formatIstDateTime(endSlotDate)}`;
    } else if (istHour >= 11) {
      // 12 PM Report: 9 AM → 12 PM
      reportPeriod = '12 PM Report (9 AM – 12 PM)';
      slotTitle = 'Leads (9 AM – 12 PM)';
      slotSheetName = 'Slot (9 AM - 12 PM)';
      startSlotDate = new Date(`${todayIstStr}T09:00:00+05:30`);
      endSlotDate = new Date(`${todayIstStr}T12:00:00+05:30`);
      coverageWindowText = `${formatIstDateTime(startSlotDate)} – ${formatIstDateTime(endSlotDate)}`;
    } else if (istHour >= 8) {
      // 9 AM Report: 6 AM → 9 AM
      reportPeriod = '9 AM Report (6 AM – 9 AM)';
      slotTitle = 'Leads (6 AM – 9 AM)';
      slotSheetName = 'Slot (6 AM - 9 AM)';
      startSlotDate = new Date(`${todayIstStr}T06:00:00+05:30`);
      endSlotDate = new Date(`${todayIstStr}T09:00:00+05:30`);
      coverageWindowText = `${formatIstDateTime(startSlotDate)} – ${formatIstDateTime(endSlotDate)}`;
    } else {
      // 6 AM Master Report: 9 PM yesterday → 6 AM today
      reportPeriod = '6 AM Master Report (Yesterday 9 PM – Today 6 AM)';
      slotTitle = 'Leads (Yesterday 9 PM – Today 6 AM)';
      slotSheetName = 'Slot (9 PM - 6 AM)';
      startSlotDate = new Date(`${yesterdayIstStr}T21:00:00+05:30`);
      endSlotDate = new Date(`${todayIstStr}T06:00:00+05:30`);
      isMaster = true;
      coverageWindowText = `${formatIstDateTime(startSlotDate)} – ${formatIstDateTime(endSlotDate)} (Yesterday 9 PM to Today 6 AM)`;
    }

    const startUtc = startSlotDate.toISOString();
    const startOfTodayUtc = new Date(`${todayIstStr}T00:00:00+05:30`).toISOString();

    let slotLeadsCount = 0;
    let todayLeadsCount = 0;
    let allTimeCount = 0;

    if (isMaster) {
      // ── Master reports: 3 PDFs (slot + today + all-time) + 1 Master Excel Workbook ──
      const { data: allTimeLeads } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (allTimeLeads) {
        const allTime = allTimeLeads.map(formatLead);

        // Slot leads
        const slotLeadsRaw = allTimeLeads.filter((l: any) => l.created_at >= startUtc);

        // Today's leads
        const todayLeadsRaw = allTimeLeads.filter((l: any) => l.created_at >= startOfTodayUtc);

        const slotLeads = slotLeadsRaw.map(formatLead);
        const todayLeads = todayLeadsRaw.map(formatLead);

        slotLeadsCount = slotLeads.length;
        todayLeadsCount = todayLeads.length;
        allTimeCount = allTime.length;

        const generationDateStr = `${formatIstDate(nowUtc)}, ${formatIstTime(nowUtc)}`;

        attachments.push({ filename: `1_slot_leads_${dateStr}.pdf`, content: await generatePDFBuffer(slotLeads, slotTitle, { generationDate: generationDateStr }) });
        attachments.push({ filename: `2_total_leads_today_${dateStr}.pdf`, content: await generatePDFBuffer(todayLeads, 'Total Leads Today', { generationDate: generationDateStr }) });
        attachments.push({ filename: `3_total_leads_all_time_${dateStr}.pdf`, content: await generatePDFBuffer(allTime, 'Total Leads All Time', { generationDate: generationDateStr }) });

        // Master Excel containing all 3 sheets: Slot, Today Total, All Time
        attachments.push({ 
          filename: `leads_master_report_${dateStr}.xlsx`, 
          content: generateMasterExcelBuffer(slotLeads, todayLeads, allTime, slotSheetName) 
        });

        emailHtml = `
          <h2>Bhuwanta ${reportPeriod}</h2>
          <p>Attached are the 3 Master PDF reports and the complete Master Excel workbook.</p>
          ${slotLeads.length === 0 && todayLeads.length === 0 ? '<p style="color:red; font-weight:bold;">Notice: No new leads came in during this period.</p>' : ''}
          <ul>
            <li><strong>Slot Leads (${slotTitle}):</strong> ${slotLeads.length} leads</li>
            <li><strong>Total Leads Today:</strong> ${todayLeads.length} leads</li>
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
      slotLeadsCount = reportData.length;
      const reportTitle = `Bhuwanta Leads - ${reportPeriod}`;
      const generationDateStr = `${formatIstDate(nowUtc)}, ${formatIstTime(nowUtc)}`;

      attachments.push({ filename: `leads_report_${dateStr}.xlsx`, content: generateExcelBuffer(reportData, slotSheetName) });
      attachments.push({ filename: `leads_report_${dateStr}.pdf`, content: await generatePDFBuffer(reportData, reportTitle, { generationDate: generationDateStr }) });

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
            // 1. Upload Excel attachments once to Meta Graph API
            const excelAttachments = attachments.filter(a => a.filename.endsWith('.xlsx'));
            const uploadedMediaMap = new Map<string, string>();

            for (const attachment of excelAttachments) {
              try {
                const form = new FormData();
                form.append('messaging_product', 'whatsapp');
                const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                form.append('type', mimeType);
                const file = new File([attachment.content], attachment.filename, { type: mimeType });
                form.append('file', file);

                const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/media`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${waToken}` },
                  body: form
                });

                if (uploadRes.ok) {
                  const uploadData = await uploadRes.json();
                  uploadedMediaMap.set(attachment.filename, uploadData.id);
                  console.log(`✅ Pre-uploaded ${attachment.filename} to Meta Media API (ID: ${uploadData.id})`);
                } else {
                  console.error('❌ WhatsApp Media Upload failed:', uploadRes.status, await uploadRes.text());
                }
              } catch (e) {
                console.error('❌ Error uploading WA attachment to Meta:', e);
              }
            }

            // 2. Deliver text summary + document to each recipient
            for (const phone of waList) {
              const formattedCurrentDate = formatIstDate(nowUtc);
              const formattedCurrentTime = formatIstTime(nowUtc);

              let summaryText = `📊 *Automated Bhuwanta CRM Report*\n\n` +
                `*Report:* ${reportPeriod}\n` +
                `*Generated:* ${formattedCurrentDate} at ${formattedCurrentTime}\n` +
                `*Coverage Window:*\n${coverageWindowText}\n\n`;

              if (isMaster) {
                summaryText += `*Slot Leads:* ${slotLeadsCount}\n` +
                  `*Total Leads Today:* ${todayLeadsCount}\n` +
                  `*Total Leads All-Time:* ${allTimeCount}\n\n`;
              } else {
                summaryText += `*Total Leads in Slot:* ${slotLeadsCount}\n\n`;
              }

              summaryText += `Please find the attached excel report below.`;
              
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

              // Send pre-uploaded document attachments
              for (const attachment of excelAttachments) {
                const mediaId = uploadedMediaMap.get(attachment.filename);
                if (!mediaId) {
                  console.warn(`⚠️ Skipping document send to ${phone} because mediaId was not generated for ${attachment.filename}`);
                  continue;
                }

                try {
                  const sendRes = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
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

                  if (!sendRes.ok) {
                    console.error(`❌ WhatsApp Document send failed to ${phone}:`, sendRes.status, await sendRes.text());
                  } else {
                    console.log(`✅ WhatsApp Excel report successfully sent to ${phone}`);
                  }
                } catch (e) {
                  console.error('❌ Error sending WA document message:', e);
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

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSystemMonitoringAlert } from '@/lib/monitoring/alerts'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // 1. Fetch active Form IDs from Supabase
    const { data: forms, error: formsError } = await supabase
      .from('meta_forms')
      .select('*')

    if (formsError) throw formsError
    if (!forms || forms.length === 0) {
      return NextResponse.json({ message: 'No active forms to sync' })
    }

    let totalLeadsAdded = 0
    const syncErrors: string[] = []

    // 2. Loop through forms and fetch leads (limit=500 per form to get historical leads without timing out)
    for (const form of forms) {
      const url = `https://graph.facebook.com/v18.0/${form.form_id}/leads?access_token=${META_ACCESS_TOKEN}&fields=created_time,id,field_data,campaign_name,ad_name&limit=500`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!data.data || data.error) {
        const errorMsg = data.error?.message || 'Unknown error from Meta'
        console.error(`Error fetching leads for form ${form.form_id}:`, data.error)
        syncErrors.push(`Form ${form.form_id}: ${errorMsg}`)
        continue // Skip to next form
      }

      // 3. Process Leads
      for (const lead of data.data) {
        const providerId = lead.id
        
        // Extract fields
        let fullName = ''
        let email = 'no-email@meta.com'
        let phone = ''
        
        lead.field_data.forEach((field: any) => {
          const name = field.name.toLowerCase()
          const val = field.values[0]
          
          if (name.includes('name')) fullName = val
          else if (name.includes('email')) email = val
          else if (name.includes('phone')) phone = val
        })

        const campaign = lead.campaign_name ? ` | Campaign: ${lead.campaign_name}` : ''
        const ad = lead.ad_name ? ` | Ad: ${lead.ad_name}` : ''
        
        const formIdentifier = form.name ? `${form.name} (${form.form_id})` : form.form_id;
        const sourceText = `Meta: ${formIdentifier}${campaign}${ad}`

        // Upsert lead using provider_id
        const { error: insertError } = await supabase
          .from('leads')
          .upsert({
            provider_id: providerId,
            name: fullName || 'Unknown Meta Lead',
            email: email,
            phone: phone || null,
            message: `Lead imported from Meta (Form: ${form.name || form.form_id})`,
            source_page: sourceText,
            status: 'new',
            created_at: lead.created_time
          }, {
            onConflict: 'provider_id',
            ignoreDuplicates: true
          })

        if (!insertError) {
          totalLeadsAdded++
        } else {
          console.error(`Error inserting lead ${providerId}:`, insertError.message)
        }
      }
    }

    if (syncErrors.length > 0 && forms && forms.length > 0 && totalLeadsAdded === 0) {
      await sendSystemMonitoringAlert({
        title: 'Meta Ads Lead Gen Sync Failed',
        triggeredBy: 'Cron: /api/cron/meta-sync',
        cooldownKey: 'meta-sync-auth-error',
        cooldownSeconds: 7200,
        items: [
          {
            service: 'Meta Ads Lead Gen Sync',
            status: 'CRITICAL',
            message: `Failed to fetch leads for ${syncErrors.length} form(s).`,
            details: syncErrors.join(' | '),
            actionRequired: 'Verify META_ACCESS_TOKEN and Meta Business Manager lead access permissions.'
          }
        ]
      }).catch(err => console.error('[Monitoring] Error alerting meta-sync failure:', err))
    }

    return NextResponse.json({ 
      success: syncErrors.length === 0 || totalLeadsAdded > 0, 
      processed: totalLeadsAdded,
      errors: syncErrors.length > 0 ? syncErrors : undefined 
    }, { status: (syncErrors.length > 0 && totalLeadsAdded === 0) ? 502 : 200 })
  } catch (error: unknown) {
    console.error('❌ Error in Meta Sync:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

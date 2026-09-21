import { createHash } from 'node:crypto'
import { whatsappSourceHint } from '@/lib/lead-attribution'
import { createClient } from '@supabase/supabase-js'

// We use the service role key to bypass RLS for webhook operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function upsertWhatsAppLead(phone: string, name: string, incomingMessage = '') {
  try {
    // Try to find existing lead with this phone
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, bot_interactions_count')
      .eq('phone', phone)
      .single()

    if (existingLead) {
      // Increment interaction count
      const newCount = (existingLead.bot_interactions_count || 1) + 1
      await supabase
        .from('leads')
        .update({ 
          bot_interactions_count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)
        
      // Lead already exists, just return it
      return existingLead
    }

    // Create new lead — email and message are NOT NULL in the DB
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        name,
        phone,
        email: `${phone}@whatsapp.lead`,
        message: 'Unverified WhatsApp contact — buying interest has not been confirmed.',
        source_page: whatsappSourceHint(incomingMessage) ? 'WhatsApp Bot | Google Ads (website message hint)' : 'WhatsApp Bot',
        status: 'new'
      })
      .select()
      .single()

    if (error) throw error
    return newLead

  } catch (error) {
    console.error('Error in upsertWhatsAppLead:', error)
    return null
  }
}

export async function logLeadActivity(phone: string, action: string, details: string) {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', phone)
      .single()

    if (lead) {
      await supabase
        .from('lead_activities')
        .insert({
          lead_id: lead.id,
          activity_type: action,
          details: details
        })
    }
  } catch (error) {
    console.error('Error in logLeadActivity:', error)
  }
}

export async function triggerSalesNotification(phone: string, project: string) {
  // Here we can trigger an email via Resend to the sales team
  // For now we just log it
  console.log(`[ALERT] Sales team notified for callback request from ${phone} regarding ${project}`)
}

/** Preserve evidence once per provider message; do not qualify the contact. */
export async function recordIncomingWhatsApp(leadId: string, messageId: string, details: string) {
  const hash = createHash('sha256').update(`whatsapp:${messageId}`).digest('hex')
  const id = `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`
  const { error } = await supabase.from('lead_activities').insert({
    id, lead_id: leadId, activity_type: 'Incoming WhatsApp message', details
  })
  // Provider retries must not create another copy of the evidence.
  if (error && error.code !== '23505') throw new Error('Could not preserve incoming WhatsApp evidence')
}

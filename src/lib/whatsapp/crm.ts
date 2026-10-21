import { createHash } from 'node:crypto'
import { whatsappSourceHint } from '@/lib/lead-attribution'
import { canonicalPhoneNumber } from '@/lib/phone-input'
import { createClient } from '@supabase/supabase-js'

// We use the service role key to bypass RLS for webhook operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findLatestLeadByPhone(canonicalPhone: string) {
  const candidateLimit = 500
  const candidatePattern = `%${canonicalPhone.replace(/\D/g, '').slice(-10).split('').join('%')}%`
  const { data: candidates, error } = await supabase
    .from('leads')
    .select('id, phone, bot_interactions_count')
    .ilike('phone', candidatePattern)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(candidateLimit + 1)

  if (error) throw error
  if ((candidates?.length || 0) > candidateLimit) {
    throw new Error('Too many phone matches to identify the WhatsApp lead safely')
  }

  // The search only finds candidates. Full country-aware equality selects a lead.
  return candidates?.find(lead => canonicalPhoneNumber(lead.phone || '') === canonicalPhone) || null
}

export async function upsertWhatsAppLead(phone: string, name: string, incomingMessage = '') {
  try {
    const canonicalPhone = canonicalPhoneNumber(phone)
    if (!canonicalPhone) return null

    // Reuse formatted historical enquiries and choose the latest exact identity.
    const existingLead = await findLatestLeadByPhone(canonicalPhone)

    if (existingLead) {
      // Increment interaction count and bump to top of CRM leads
      const newCount = (existingLead.bot_interactions_count || 1) + 1
      const now = new Date().toISOString()
      
      const updatePayload: Record<string, any> = { 
        bot_interactions_count: newCount,
        updated_at: now,
        created_at: now, // Bump lead to the top of CRM leads list
      }

      if (name && name !== 'WhatsApp User') {
        updatePayload.name = name
      }

      if (incomingMessage) {
        updatePayload.message = `Latest WhatsApp message: "${incomingMessage}"`
      }

      await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', existingLead.id)
        
      // Lead already exists, return updated record
      return { ...existingLead, ...updatePayload }
    }

    // Create new lead — email and message are NOT NULL in the DB
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        name,
        phone: canonicalPhone,
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
    const canonicalPhone = canonicalPhoneNumber(phone)
    if (!canonicalPhone) return
    const lead = await findLatestLeadByPhone(canonicalPhone)

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
export async function recordIncomingWhatsApp(leadId: string, messageId: string, details: string): Promise<boolean> {
  const hash = createHash('sha256').update(`whatsapp:${messageId}`).digest('hex')
  const id = `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`
  const { error } = await supabase.from('lead_activities').insert({
    id, lead_id: leadId, activity_type: 'Incoming WhatsApp message', details
  })
  // Provider retries must not create another copy of the evidence.
  if (error && error.code === '23505') return false
  if (error) throw new Error('Could not preserve incoming WhatsApp evidence')
  return true
}

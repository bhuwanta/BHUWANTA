// Notification helpers for the bulk reset. Deliberately NOT a 'use server'
// file: both take a Supabase service client as their first argument, so
// they could never be invoked as Server Actions anyway (the argument is
// not serializable) — yet exporting them from one still published them on
// the action surface, where middleware's `next-action` bypass means no
// session check stands in front of them. As plain exports they are
// reachable only from server code that already holds a client.

import { createServiceClient } from '@/lib/supabase/server'
import { sendPasswordChangedEmail } from '@/lib/emails/resend'

/** Every real login email for a set of profile ids, paginated past
 * Supabase's 1000-per-call listUsers cap — same reasoning as
 * getUsersForBulkPasswordAction's own paging. Auth is the only place an
 * email lives (S_realestate_users has no email column), and there's no
 * "give me these specific ids" filter on listUsers, so this walks every
 * page once and keeps only the ones actually asked for. Exported: the
 * streaming bulk-password-reset route (api/bulk-password-reset) needs
 * this same lookup and shouldn't duplicate it. */
export async function getAuthEmailMap(supabaseAdmin: ReturnType<typeof createServiceClient>, ids: string[]): Promise<Map<string, string>> {
  const wanted = new Set(ids)
  const map = new Map<string, string>()
  const PAGE = 1000

  for (let page = 1; wanted.size > map.size; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PAGE })
    if (error) {
      console.error('Error paging auth users for email lookup:', error)
      break
    }
    const users = data?.users || []
    for (const u of users) {
      if (wanted.has(u.id) && u.email) map.set(u.id, u.email)
    }
    if (users.length < PAGE) break
  }
  return map
}

/** Emails everyone in `succeededIds` their new password directly (an
 * Email/Password block, at the sender's explicit request — this used to
 * withhold the password and say "ask your admin", not anymore). Shared
 * between anything that runs a bulk password reset; today that's only
 * the streaming route (api/bulk-password-reset/route.ts), which calls
 * this via next/server's after(), once the reset itself has already
 * responded to the caller — Resend's own pace shouldn't hold up
 * confirming the actual password change succeeded.
 *
 * Resend's send endpoint allows 10 req/s (confirmed live against this
 * project's key); 2 concurrent here is comfortably under that. The real
 * free-tier ceiling isn't the rate limit but the DAILY/MONTHLY send
 * quota (100/day, 3,000/month on Resend's free plan) — a reset across
 * hundreds of real recipients can exhaust that outright, in which case
 * the remaining sends fail individually below rather than affecting the
 * password changes that already succeeded. */
export async function sendBulkPasswordChangeNotifications(supabaseAdmin: ReturnType<typeof createServiceClient>, succeededIds: string[], newPassword: string) {
  if (succeededIds.length === 0) return
  try {
    const [{ data: profiles }, emailById] = await Promise.all([
      supabaseAdmin.from('s_realestate_users').select('id, full_name').in('id', succeededIds),
      getAuthEmailMap(supabaseAdmin, succeededIds),
    ])
    const nameById = new Map<string, string>()
    ;(profiles || []).forEach((p: any) => nameById.set(p.id as string, (p.full_name as string) || ''))

    const EMAIL_CONCURRENCY = 2
    for (let i = 0; i < succeededIds.length; i += EMAIL_CONCURRENCY) {
      const slice = succeededIds.slice(i, i + EMAIL_CONCURRENCY)
      await Promise.all(
        slice.map(async (id) => {
          const email = emailById.get(id)
          if (!email) return
          try {
            await sendPasswordChangedEmail(email, nameById.get(id) || '', newPassword)
          } catch (e) {
            console.error(`Error sending password-changed email to ${email}:`, e)
          }
        })
      )
    }
  } catch (e) {
    console.error('Error notifying accounts after bulk password reset:', e)
  }
}


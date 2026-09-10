// Streaming counterpart to the (now-removed) bulkResetPasswordsAction
// Server Action, reached from the Bulk Change Passwords button on User
// Management. Lives under role/it/modules — IT always has full,
// company-wide access; a sales-tier role only reaches this at all once
// IT switches it on for them via the "Bulk Change Passwords" module
// (Modules page), and even then is capped to their own downline (see
// requireBulkPasswordAccess). A plain Server Action can only return ONE
// value at the very end — there's no way to tell the caller "37 of
// 1,094 done" while it's still running. This is a Route Handler
// instead, returning a newline-delimited JSON stream: one `progress`
// line per batch as it completes, so the popup can show a live
// "X / Y done" count instead of a static spinner.

import { after } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validatePassword } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/password-policy'
import { sendBulkPasswordChangeNotifications, requireBulkPasswordAccess } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/user-management/actions'

export async function POST(req: Request) {
  // Full company-wide reach for IT; a module-enabled sales-tier role is
  // capped to their own downline — re-derived from the real session
  // here, never trusted from the client, same as every other access
  // check in this app.
  const access = await requireBulkPasswordAccess()
  if (!access.ok) {
    return new Response(JSON.stringify({ error: access.error }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }
  const allowedIds = access.scope === 'downline' ? new Set(access.downlineIds) : null

  let body: { userIds?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const userIds = Array.isArray(body.userIds) ? (body.userIds as unknown[]).filter((v): v is string => typeof v === 'string') : []
  const password = typeof body.password === 'string' ? body.password : ''

  const passwordError = validatePassword(password)
  if (passwordError) {
    return new Response(JSON.stringify({ error: passwordError }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  // Never the caller, whatever the client sent — a bulk reset that swept
  // up whoever's running it would change their own password mid-run.
  // For a downline-scoped caller, anything outside their own wing is
  // silently dropped here too — the picker only ever shows their wing,
  // but this is the real, re-verified boundary, not a trust in what the
  // client happened to submit.
  const targets = [...new Set(userIds)].filter((id) => id && id !== access.id && (allowedIds === null || allowedIds.has(id)))
  if (targets.length === 0) {
    return new Response(JSON.stringify({ error: 'No accounts selected.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const supabaseAdmin = createServiceClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      const total = targets.length
      const failures: { id: string; error: string }[] = []
      const succeededIds: string[] = []
      // Same batching the old Server Action used — a thousand
      // simultaneous Auth admin calls would rate-limit and half-apply,
      // leaving an unknowable mix of old and new passwords.
      const CONCURRENCY = 10

      send({ type: 'start', total })

      for (let i = 0; i < targets.length; i += CONCURRENCY) {
        const slice = targets.slice(i, i + CONCURRENCY)
        const results = await Promise.all(
          slice.map(async (id) => {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password })
            return { id, error: error?.message || null }
          })
        )
        results.forEach((r) => {
          if (r.error) failures.push({ id: r.id, error: r.error })
          else succeededIds.push(r.id)
        })
        send({ type: 'progress', done: Math.min(i + CONCURRENCY, total), total })
      }

      send({
        type: 'done',
        updated: succeededIds.length,
        failed: failures.length,
        failures,
        message: `Password reset for ${succeededIds.length} account${succeededIds.length === 1 ? '' : 's'}${failures.length > 0 ? `; ${failures.length} failed` : ''}.`,
      })
      controller.close()

      // Background, after the stream (and the password changes it
      // reported) has already reached the caller — Resend's own pace
      // shouldn't hold up confirming the reset itself succeeded.
      after(() => sendBulkPasswordChangeNotifications(supabaseAdmin, succeededIds, password))
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

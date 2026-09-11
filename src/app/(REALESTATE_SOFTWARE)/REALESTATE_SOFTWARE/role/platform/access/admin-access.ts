'use server'

import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { isAdminPeer } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'

/**
 * "Is the real caller IT, Company or Governing Council?" — the §2 peer
 * rule, re-derived from the session rather than from anything the client
 * sent.
 *
 * This existed as a private copy in three separate action files, so a
 * fourth file that needed it had no obvious one to import and tended to
 * ship with no check at all. Shared here, in the folder this plan already
 * designates for "who is allowed to see/do what".
 *
 * Worth stating plainly, because it is load-bearing: middleware skips its
 * RBAC entirely for Server Action requests (the `next-action` header
 * branch), on the stated assumption that every action authenticates
 * itself. An action with no call to a guard like this one is therefore
 * reachable by an unauthenticated POST, not merely by the wrong role.
 */
export async function requireAdminPeer(): Promise<
  { ok: true; id: string; role: string } | { ok: false; error: string }
> {
  const caller = await verifyCaller()
  if (!caller || !isAdminPeer(caller.role)) {
    return { ok: false as const, error: 'Only IT, Company or Governing Council can do this.' }
  }
  return { ok: true as const, id: caller.id, role: caller.role }
}

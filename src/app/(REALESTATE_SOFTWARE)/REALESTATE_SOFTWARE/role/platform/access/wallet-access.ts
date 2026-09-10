'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth'
import { isCommissionEligible, isAdminPeer, isSalesRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions'

/** My Wallet's module gate. Company and Governing Council always keep
 * their own wallet (admin peers, §2) and IT never had one at all
 * (isCommissionEligible('it') === false) — this only governs the eight
 * sales tiers. A missing module row reads as enabled, since the row is
 * only created the first time IT opens the Modules page and failing
 * closed there would hide everyone's earnings until they did.
 *
 * Lives in platform/access rather than modules/wallet because
 * SalesLayout (platform/ui) calls checkMyWalletModuleAction below to
 * decide whether to draw the nav link — a page module must never be
 * something the shared shell depends on. It has no wallet-module
 * dependencies of its own, only auth + the role model. */
export async function requireCanViewWallet() {
  const caller = await verifyCaller()
  if (!caller) return { ok: false as const, error: 'Not authenticated, or your account is inactive.' }
  if (!isCommissionEligible(caller.role)) return { ok: false as const, error: 'This role does not earn commission.' }
  if (isAdminPeer(caller.role) || !isSalesRole(caller.role)) return { ok: true as const, caller }

  const supabaseAdmin = createServiceClient()
  const { data } = await supabaseAdmin.from('s_modules').select('enabled_roles').eq('module_key', 'wallet').maybeSingle()
  if (data && !((data.enabled_roles as string[]) || []).includes(caller.role)) {
    return { ok: false as const, error: 'The My Wallet module is not enabled for your role.' }
  }
  return { ok: true as const, caller }
}

/** Non-authoritative check for the caller's own session role — decides
 * whether SalesLayout draws the nav link. requireCanViewWallet above is
 * the real gate. */
export async function checkMyWalletModuleAction(): Promise<boolean> {
  const res = await requireCanViewWallet()
  return res.ok
}

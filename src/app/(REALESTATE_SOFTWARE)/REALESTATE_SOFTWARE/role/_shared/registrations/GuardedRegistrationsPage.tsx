import { notFound } from 'next/navigation';
import RegistrationsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/registrations/RegistrationsPage';
import { requireCanViewRegistrations } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/registrations/actions';
import type { RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';

/** Registration Status behind its module gate. Every role's route file
 * renders this rather than RegistrationsPage directly — each of the
 * eight sales tiers has its own literal route directory (role/lia/…,
 * role/director/…) that takes priority over role/[roleCode]/…, so a
 * guard placed only on the dynamic fallback would never run for any of
 * them. One shared server wrapper keeps that from silently drifting
 * again as roles are added. */
export default async function GuardedRegistrationsPage({ currentUserRole, currentUserId }: { currentUserRole: RealEstateRole; currentUserId: string }) {
  const allowed = await requireCanViewRegistrations();
  if (!allowed.ok) notFound();
  return <RegistrationsPage currentUserRole={currentUserRole} currentUserId={currentUserId} />;
}

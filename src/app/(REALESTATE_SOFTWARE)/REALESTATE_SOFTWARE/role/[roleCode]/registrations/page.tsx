import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import GuardedRegistrationsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/registrations/GuardedRegistrationsPage';
import type { RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';

export default async function DynamicRoleRegistrationsPage({ params }: { params: Promise<{ roleCode: string }> }) {
  const { roleCode } = await params;
  const { userId, role } = await requireRole(roleCode as RealEstateRole);
  return <GuardedRegistrationsPage currentUserRole={role} currentUserId={userId} />;
}

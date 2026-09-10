import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import GuardedNewRegistrationPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/new-registration/GuardedNewRegistrationPage';
import type { RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';

export default async function DynamicRoleNewRegistrationPage({ params }: { params: Promise<{ roleCode: string }> }) {
  const { roleCode } = await params;
  await requireRole(roleCode as RealEstateRole);
  return <GuardedNewRegistrationPage />;
}

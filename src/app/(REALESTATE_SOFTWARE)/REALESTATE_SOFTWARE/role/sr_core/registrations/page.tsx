import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import RegistrationsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/registrations/GuardedRegistrationsPage';

export default async function SrCoreRegistrationsPage() {
  const { userId, role } = await requireRole('sr_core');
  return <RegistrationsPage currentUserRole={role} currentUserId={userId} />;
}

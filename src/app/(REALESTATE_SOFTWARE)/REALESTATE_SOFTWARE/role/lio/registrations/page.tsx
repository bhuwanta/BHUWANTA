import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import RegistrationsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/registration-status/GuardedRegistrationsPage';

export default async function LIORegistrationsPage() {
  const { userId, role } = await requireRole('lio');
  return <RegistrationsPage currentUserRole={role} currentUserId={userId} />;
}

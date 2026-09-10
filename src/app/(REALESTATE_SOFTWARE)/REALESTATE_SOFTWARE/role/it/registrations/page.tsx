import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import RegistrationsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/registration-status/RegistrationsPage';

export default async function ITRegistrationsPage() {
  const { userId, role } = await requireRole('it');
  return <RegistrationsPage currentUserRole={role} currentUserId={userId} />;
}

import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import RegistrationsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/registrations/GuardedRegistrationsPage';

export default async function AGMRegistrationsPage() {
  const { userId, role } = await requireRole('agm');
  return <RegistrationsPage currentUserRole={role} currentUserId={userId} />;
}

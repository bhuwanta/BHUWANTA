import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import RegistrationsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/registrations/RegistrationsPage';

export default async function ITRegistrationsPage() {
  const { userId, role } = await requireRole('it');
  return <RegistrationsPage currentUserRole={role} currentUserId={userId} />;
}

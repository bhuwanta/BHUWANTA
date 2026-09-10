import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import RegistrationsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/registrations/GuardedRegistrationsPage';

export default async function LIARegistrationsPage() {
  const { userId, role } = await requireRole('lia');
  return <RegistrationsPage currentUserRole={role} currentUserId={userId} />;
}

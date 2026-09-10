import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import RegistrationsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/registrations/RegistrationsPage';

export default async function CEORegistrationsPage() {
  const { userId, role } = await requireRole('ceo');
  return <RegistrationsPage currentUserRole={role} currentUserId={userId} />;
}

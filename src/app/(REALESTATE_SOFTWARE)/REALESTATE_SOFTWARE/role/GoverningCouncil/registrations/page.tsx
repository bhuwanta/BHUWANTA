import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import RegistrationsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/registrations/RegistrationsPage';

export default async function GoverningCouncilRegistrationsPage() {
  const { userId, role } = await requireRole('governing_council');
  return <RegistrationsPage currentUserRole={role} currentUserId={userId} />;
}

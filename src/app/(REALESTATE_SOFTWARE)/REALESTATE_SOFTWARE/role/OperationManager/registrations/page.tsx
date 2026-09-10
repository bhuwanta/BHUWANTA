import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import RegistrationsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/registrations/RegistrationsPage';

export default async function OperationManagerRegistrationsPage() {
  const { userId, role } = await requireRole('operation_manager');
  return <RegistrationsPage currentUserRole={role} currentUserId={userId} />;
}

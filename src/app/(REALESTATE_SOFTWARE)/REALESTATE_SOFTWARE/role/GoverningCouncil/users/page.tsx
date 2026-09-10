import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import UserManagementModule from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/user-management/UserManagementModule';

export default async function GoverningCouncilUsersPage() {
  const { userId, role } = await requireRole('governing_council');
  return <UserManagementModule currentUserRole={role} currentUserId={userId} />;
}

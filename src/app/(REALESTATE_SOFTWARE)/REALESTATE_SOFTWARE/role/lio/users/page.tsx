import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import UserManagementModule from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/user-management/UserManagementModule';

export default async function LIOUsersPage() {
  const { userId, role } = await requireRole('lio');
  return <UserManagementModule currentUserRole={role} currentUserId={userId} />;
}

import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import UserManagementModule from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/user-management/UserManagementModule';

export default async function AGMUsersPage() {
  const { userId, role } = await requireRole('agm');
  return <UserManagementModule currentUserRole={role} currentUserId={userId} />;
}

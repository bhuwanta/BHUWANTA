import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import UserManagementModule from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/user-management/UserManagementModule';

export default async function GMUsersPage() {
  const { userId, role } = await requireRole('gm');
  return <UserManagementModule currentUserRole={role} currentUserId={userId} />;
}

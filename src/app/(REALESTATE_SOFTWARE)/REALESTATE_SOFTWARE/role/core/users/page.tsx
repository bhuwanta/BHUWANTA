import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import UserManagementModule from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/user-management/UserManagementModule';

export default async function CoreUsersPage() {
  const { userId, role } = await requireRole('core');
  return <UserManagementModule currentUserRole={role} currentUserId={userId} />;
}

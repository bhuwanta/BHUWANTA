import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import UserManagementModule from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/user-management/UserManagementModule';

export default async function SrCoreUsersPage() {
  const { userId, role } = await requireRole('sr_core');
  return <UserManagementModule currentUserRole={role} currentUserId={userId} />;
}

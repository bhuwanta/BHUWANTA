import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import AdminDashboard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/dashboard/AdminDashboard';

export default async function ITDashboardPage() {
  const { userId, role } = await requireRole('it');
  return <AdminDashboard currentUserRole={role} currentUserId={userId} />;
}

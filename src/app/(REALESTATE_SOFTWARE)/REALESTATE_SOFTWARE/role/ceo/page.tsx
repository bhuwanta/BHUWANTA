import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import AdminDashboard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/dashboard/AdminDashboard';

export default async function CEODashboardPage() {
  const { userId, role } = await requireRole('ceo');
  return <AdminDashboard currentUserRole={role} currentUserId={userId} />;
}

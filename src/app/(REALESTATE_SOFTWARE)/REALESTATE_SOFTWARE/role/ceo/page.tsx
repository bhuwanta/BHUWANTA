import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import AdminDashboard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/dashboard/AdminDashboard';

export default async function CEODashboardPage() {
  const { userId, role } = await requireRole('ceo');
  return <AdminDashboard currentUserRole={role} currentUserId={userId} />;
}

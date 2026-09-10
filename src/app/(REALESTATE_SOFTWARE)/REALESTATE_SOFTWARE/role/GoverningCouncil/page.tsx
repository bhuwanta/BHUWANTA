import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import AdminDashboard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/dashboard/AdminDashboard';

export default async function GoverningCouncilDashboardPage() {
  const { userId, role } = await requireRole('governing_council');
  return <AdminDashboard currentUserRole={role} currentUserId={userId} />;
}

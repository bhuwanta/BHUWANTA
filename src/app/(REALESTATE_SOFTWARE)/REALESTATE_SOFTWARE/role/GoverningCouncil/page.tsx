import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import AdminDashboard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/dashboard/AdminDashboard';

export default async function GoverningCouncilDashboardPage() {
  const { userId, role } = await requireRole('governing_council');
  return <AdminDashboard currentUserRole={role} currentUserId={userId} />;
}

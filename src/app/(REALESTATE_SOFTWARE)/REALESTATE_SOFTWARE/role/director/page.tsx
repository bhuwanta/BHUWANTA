import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import SalesDashboard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/dashboard/SalesDashboard';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/PageModuleGuard';

export default async function DirectorDashboardPage() {
  const { role } = await requireRole('director');
  return (
    <PageModuleGuard moduleKey="dashboard" redirectBase="/REALESTATE_SOFTWARE/role/director">
      <SalesDashboard currentUserRole={role} />
    </PageModuleGuard>
  );
}

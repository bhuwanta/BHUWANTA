import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import SalesDashboard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/sales/dashboard/SalesDashboard';
import type { RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/permissions';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/PageModuleGuard';

export default async function DynamicRoleDashboardPage({ params }: { params: Promise<{ roleCode: string }> }) {
  const { roleCode } = await params;
  const { role } = await requireRole(roleCode as RealEstateRole);
  return (
    <PageModuleGuard moduleKey="dashboard">
      <SalesDashboard currentUserRole={role} />
    </PageModuleGuard>
  );
}

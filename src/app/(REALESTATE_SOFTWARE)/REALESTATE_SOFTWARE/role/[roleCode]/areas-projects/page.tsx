import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import AreasProjectsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/areas-projects/AreasProjectsPage';
import type { RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/PageModuleGuard';

export default async function DynamicRoleAreasProjectsPage({ params }: { params: Promise<{ roleCode: string }> }) {
  const { roleCode } = await params;
  await requireRole(roleCode as RealEstateRole);
  return (
    <PageModuleGuard moduleKey="areas_projects">
      <AreasProjectsPage />
    </PageModuleGuard>
  );
}

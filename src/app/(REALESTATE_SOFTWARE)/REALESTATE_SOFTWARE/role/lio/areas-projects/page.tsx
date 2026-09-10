import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import AreasProjectsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/areas-projects/AreasProjectsPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/PageModuleGuard';

export default async function LIOAreasProjectsPage() {
  await requireRole('lio');
  return (
    <PageModuleGuard moduleKey="areas_projects">
      <AreasProjectsPage />
    </PageModuleGuard>
  );
}

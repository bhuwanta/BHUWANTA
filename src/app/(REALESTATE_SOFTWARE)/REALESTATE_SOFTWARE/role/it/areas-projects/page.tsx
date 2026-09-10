import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import AreasProjectsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/areas-projects/AreasProjectsPage';

export default async function ITAreasProjectsPage() {
  await requireRole('it');
  return <AreasProjectsPage canManage />;
}

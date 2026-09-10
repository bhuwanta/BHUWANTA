import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import MyProjectsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/my-projects/MyProjectsPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/PageModuleGuard';

export default async function AGMProjectsPage() {
  await requireRole('agm');
  return (
    <PageModuleGuard moduleKey="my_projects">
      <MyProjectsPage />
    </PageModuleGuard>
  );
}

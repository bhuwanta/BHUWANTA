import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import MyProjectsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/sales/my-projects/MyProjectsPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/PageModuleGuard';

export default async function DirectorProjectsPage() {
  await requireRole('director');
  return (
    <PageModuleGuard moduleKey="my_projects">
      <MyProjectsPage />
    </PageModuleGuard>
  );
}

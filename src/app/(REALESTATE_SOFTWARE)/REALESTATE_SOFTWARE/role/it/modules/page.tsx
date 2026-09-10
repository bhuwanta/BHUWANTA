import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import ModulesPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/modules/ModulesPage';

export default async function ITModulesPage() {
  await requireRole('it');
  return <ModulesPage />;
}

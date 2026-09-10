import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import ModulesPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/it/modules/ModulesPage';

export default async function ITModulesPage() {
  await requireRole('it');
  return <ModulesPage />;
}

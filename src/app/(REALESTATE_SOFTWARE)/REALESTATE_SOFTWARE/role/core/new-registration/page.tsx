import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import NewRegistrationPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/new-registration/GuardedNewRegistrationPage';

export default async function CoreNewRegistrationPage() {
  await requireRole('core');
  return <NewRegistrationPage />;
}

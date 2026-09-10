import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import NewRegistrationPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/sales/new-registration/GuardedNewRegistrationPage';

export default async function CoreNewRegistrationPage() {
  await requireRole('core');
  return <NewRegistrationPage />;
}

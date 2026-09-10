import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import NewRegistrationPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/sales/new-registration/NewRegistrationPage';

export default async function CEONewRegistrationPage() {
  await requireRole('ceo');
  return <NewRegistrationPage />;
}

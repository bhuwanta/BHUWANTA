import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import RegistrationStatusPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/customer/RegistrationStatusPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/PageModuleGuard';

export default async function CustomerRegistrationStatusPage() {
  await requireRole('customer');
  return (
    <PageModuleGuard moduleKey="customer_registration_status">
      <RegistrationStatusPage />
    </PageModuleGuard>
  );
}

import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import ContactPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/customer/ContactPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/PageModuleGuard';

export default async function CustomerContactPage() {
  await requireRole('customer');
  return (
    <PageModuleGuard moduleKey="customer_contact">
      <ContactPage />
    </PageModuleGuard>
  );
}

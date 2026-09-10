import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import ContactPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/contact/ContactPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/PageModuleGuard';

export default async function CustomerContactPage() {
  await requireRole('customer');
  return (
    <PageModuleGuard moduleKey="customer_contact">
      <ContactPage />
    </PageModuleGuard>
  );
}
